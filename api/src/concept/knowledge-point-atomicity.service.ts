/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIRouterService } from '../ai/ai-router.service';
import {
  AtomicityStatus,
  KnowledgePoint,
  AITaskType,
  Prisma,
} from '@prisma/client';
import {
  computeNormalizedKey,
  getAtomicitySuspicionScore,
} from '../common/utils/normalization.util';
import { AtomicityValidationOutput } from '../ai/prompts/atomicity-validation.prompt';
import { AtomicitySplittingOutput } from '../ai/prompts/atomicity-splitting.prompt';
import { v4 as uuidv4 } from 'uuid';

export interface ValidateResult {
  status: AtomicityStatus;
  score?: number;
  reason?: string;
}

export interface SplitResult {
  created: number;
  deduped: number;
  failed: number;
}

export interface AtomicityStats {
  total: number;
  unchecked: number;
  atomic: number;
  nonAtomic: number;
  failed: number;
  active: number;
  inactive: number;
}

@Injectable()
export class KnowledgePointAtomicityService {
  private readonly logger = new Logger(KnowledgePointAtomicityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRouter: AIRouterService,
  ) {}

  /**
   * Validate a single knowledge point for atomicity
   * Uses heuristics first for cheap check, then AI validation if needed
   */
  async validateOne(kpId: string): Promise<ValidateResult> {
    try {
      // Load KP
      const kp = await this.prisma.knowledgePoint.findUnique({
        where: { id: kpId },
        include: { topic: true, subtopic: true },
      });

      if (!kp) {
        throw new NotFoundException(`KnowledgePoint ${kpId} not found`);
      }

      // If already validated with deterministic result, return cached result
      // FAILED can be retried to recover from transient AI/provider errors
      if (
        kp.atomicityStatus === AtomicityStatus.ATOMIC ||
        kp.atomicityStatus === AtomicityStatus.NON_ATOMIC
      ) {
        return {
          status: kp.atomicityStatus,
          score: kp.atomicityScore ?? undefined,
          reason: kp.atomicityReason ?? undefined,
        };
      }

      // Heuristic check first (cheap)
      const suspicionScore = getAtomicitySuspicionScore(kp.fact);

      // If low suspicion, mark as ATOMIC immediately (high confidence ~0.9)
      if (suspicionScore < 0.3) {
        await this.prisma.knowledgePoint.update({
          where: { id: kpId },
          data: {
            atomicityStatus: AtomicityStatus.ATOMIC,
            atomicityScore: 0.95, // High confidence heuristic
            atomicityReason: 'Heuristic atomic',
          },
        });

        return {
          status: AtomicityStatus.ATOMIC,
          score: 0.95,
          reason: 'Heuristic atomic',
        };
      }

      // Higher suspicion - use AI validation
      try {
        const aiResult = await this.aiRouter.runTask(
          AITaskType.KP_ATOMICITY_VALIDATE,
          {
            fact: kp.fact,
            category: kp.topic?.name,
            subcategory: kp.subtopic?.name,
          },
        );

        // Parse AI response (expected to be JSON)
        const validationOutput: AtomicityValidationOutput = JSON.parse(
          typeof aiResult === 'string' ? aiResult : JSON.stringify(aiResult),
        );

        const status = validationOutput.isAtomic
          ? AtomicityStatus.ATOMIC
          : AtomicityStatus.NON_ATOMIC;

        // Update KP with validation result
        await this.prisma.knowledgePoint.update({
          where: { id: kpId },
          data: {
            atomicityStatus: status,
            atomicityScore: validationOutput.score,
            atomicityReason: validationOutput.reason,
          },
        });

        return {
          status,
          score: validationOutput.score,
          reason: validationOutput.reason,
        };
      } catch (aiError) {
        this.logger.error(
          `AI validation failed for KP ${kpId}: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`,
        );

        // Mark as FAILED if AI call fails
        await this.prisma.knowledgePoint.update({
          where: { id: kpId },
          data: {
            atomicityStatus: AtomicityStatus.FAILED,
            atomicityReason:
              `AI validation error: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`.slice(
                0,
                500,
              ),
          },
        });

        return {
          status: AtomicityStatus.FAILED,
          reason: `AI validation error`,
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to validate KP ${kpId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Split a non-atomic KP into multiple atomic KPs
   * Idempotent: calling twice with same KP is safe
   */
  async splitAndReplace(kpId: string): Promise<SplitResult> {
    try {
      // Load KP
      let kp = await this.prisma.knowledgePoint.findUnique({
        where: { id: kpId },
        include: { topic: true, subtopic: true },
      });

      if (!kp) {
        throw new NotFoundException(`KnowledgePoint ${kpId} not found`);
      }

      // If already replaced, this is idempotent - return no-op
      if (kp.replacedAt) {
        this.logger.log(
          `KP ${kpId} already replaced at ${kp.replacedAt}, skipping`,
        );
        return { created: 0, deduped: 0, failed: 0 };
      }

      // Validate first
      const validationResult = await this.validateOne(kpId);

      // If ATOMIC, no-op
      if (validationResult.status === AtomicityStatus.ATOMIC) {
        this.logger.log(`KP ${kpId} is already ATOMIC, no split needed`);
        return { created: 0, deduped: 0, failed: 0 };
      }

      // If FAILED, can't split
      if (validationResult.status === AtomicityStatus.FAILED) {
        this.logger.warn(`KP ${kpId} validation failed, cannot split`);
        return { created: 0, deduped: 0, failed: 0 };
      }

      // Reload KP with updated atomicityStatus
      kp = await this.prisma.knowledgePoint.findUnique({
        where: { id: kpId },
        include: { topic: true, subtopic: true },
      })!;
      if (!kp) {
        throw new NotFoundException(
          `KnowledgePoint ${kpId} not found after validation`,
        );
      }
      // NON_ATOMIC - call AI split
      try {
        const aiResult = await this.aiRouter.runTask(
          AITaskType.KP_ATOMICITY_SPLIT,
          {
            fact: kp.fact,
            category: kp.topic?.name,
            subcategory: kp.subtopic?.name,
            estimatedFactCount: validationResult.score
              ? Math.ceil(validationResult.score * 5) // Rough estimate
              : 2,
          },
        );

        // Parse AI response
        const splittingOutput: AtomicitySplittingOutput = JSON.parse(
          typeof aiResult === 'string' ? aiResult : JSON.stringify(aiResult),
        );

        if (
          !Array.isArray(splittingOutput.facts) ||
          splittingOutput.facts.length === 0
        ) {
          throw new BadRequestException('AI splitting returned no facts');
        }

        // Start transaction to atomically create split KPs
        const splitGroupId = uuidv4();
        let created = 0;
        let deduped = 0;

        await this.prisma.$transaction(async (tx) => {
          // Mark parent as replaced
          await tx.knowledgePoint.update({
            where: { id: kpId },
            data: {
              isActive: false,
              replacedAt: new Date(),
              atomicityStatus: AtomicityStatus.NON_ATOMIC,
              splitGroupId,
            },
          });

          // Process each split fact
          for (const fact of splittingOutput.facts) {
            const normalizedKey = computeNormalizedKey(fact);

            try {
              // Try to find existing KP with same normalized key
              const existing = await tx.knowledgePoint.findUnique({
                where: { normalizedKey },
              });

              if (existing) {
                // Deduplicate: increment sourceCount
                await tx.knowledgePoint.update({
                  where: { id: existing.id },
                  data: {
                    sourceCount: existing.sourceCount + 1,
                    // Optionally update splitGroupId if not set
                    splitGroupId: existing.splitGroupId ?? splitGroupId,
                  },
                });
                deduped++;
              } else {
                // Create new atomic KP
                await tx.knowledgePoint.create({
                  data: {
                    fact,
                    normalizedKey,
                    source: kp.source,
                    topicId: kp.topicId,
                    subtopicId: kp.subtopicId,
                    lessonId: kp.lessonId,
                    priority: kp.priority,
                    examRelevance: kp.examRelevance,
                    examPattern: kp.examPattern,
                    approvalStatus: kp.approvalStatus,
                    classificationConfidence: kp.classificationConfidence,
                    sourceCount: 1,
                    atomicityStatus: AtomicityStatus.ATOMIC,
                    isActive: true,
                    splitFromId: kpId,
                    splitGroupId,
                  },
                });
                created++;
              }
            } catch (error) {
              this.logger.error(
                `Failed to process split fact: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
              // Continue with next fact on error
            }
          }
        });

        this.logger.log(
          `KP ${kpId} split complete: created=${created}, deduped=${deduped}`,
        );
        return { created, deduped, failed: 0 };
      } catch (aiError) {
        this.logger.error(
          `AI splitting failed for KP ${kpId}: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`,
        );

        // Mark parent as FAILED
        await this.prisma.knowledgePoint.update({
          where: { id: kpId },
          data: {
            atomicityStatus: AtomicityStatus.FAILED,
            atomicityReason:
              `Split failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`.slice(
                0,
                500,
              ),
          },
        });

        return { created: 0, deduped: 0, failed: 1 };
      }
    } catch (error) {
      this.logger.error(
        `Failed to split KP ${kpId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Validate many KPs with optional filters
   * Supports scoping by topic/subtopic and pagination
   */
  async validateMany(filter: {
    kpIds?: string[];
    topicId?: string;
    subtopicId?: string;
    atomicityStatus?: AtomicityStatus;
    limit?: number;
  }): Promise<{ processed: number; results: ValidateResult[] }> {
    const limit = filter.limit ?? 100;

    // Build where clause
    const where: Prisma.KnowledgePointWhereInput = {
      AND: [
        filter.kpIds?.length ? { id: { in: filter.kpIds } } : {},
        filter.topicId ? { topicId: filter.topicId } : {},
        filter.subtopicId ? { subtopicId: filter.subtopicId } : {},
        filter.atomicityStatus
          ? { atomicityStatus: filter.atomicityStatus }
          : {
              atomicityStatus: {
                in: [AtomicityStatus.UNCHECKED, AtomicityStatus.FAILED],
              },
            },
      ].filter((w) => Object.keys(w).length > 0),
    };

    // Fetch KPs
    const kps = await this.prisma.knowledgePoint.findMany({
      where,
      take: limit,
      select: { id: true },
    });

    this.logger.log(
      `Validating ${kps.length} KPs with filter: ${JSON.stringify(filter)}`,
    );

    const results: ValidateResult[] = [];
    for (const kp of kps) {
      try {
        const result = await this.validateOne(kp.id);
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Failed to validate KP ${kp.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        results.push({
          status: AtomicityStatus.FAILED,
          reason: 'Validation error',
        });
      }
    }

    return { processed: kps.length, results };
  }

  /**
   * Split many non-atomic KPs
   * Supports scoping and pagination
   */
  async splitMany(filter: {
    kpIds?: string[];
    topicId?: string;
    subtopicId?: string;
    limit?: number;
  }): Promise<{
    processed: number;
    totalCreated: number;
    totalDeduped: number;
  }> {
    const limit = filter.limit ?? 100;

    // Build where clause - only non-atomic and active
    const where: Prisma.KnowledgePointWhereInput = {
      AND: [
        { atomicityStatus: AtomicityStatus.NON_ATOMIC },
        { isActive: true },
        filter.kpIds?.length ? { id: { in: filter.kpIds } } : {},
        filter.topicId ? { topicId: filter.topicId } : {},
        filter.subtopicId ? { subtopicId: filter.subtopicId } : {},
      ].filter((w) => Object.keys(w).length > 0),
    };

    // Fetch KPs
    const kps = await this.prisma.knowledgePoint.findMany({
      where,
      take: limit,
      select: { id: true },
    });

    this.logger.log(
      `Splitting ${kps.length} non-atomic KPs with filter: ${JSON.stringify(filter)}`,
    );

    let totalCreated = 0;
    let totalDeduped = 0;

    for (const kp of kps) {
      try {
        const result = await this.splitAndReplace(kp.id);
        totalCreated += result.created;
        totalDeduped += result.deduped;
      } catch (error) {
        this.logger.error(
          `Failed to split KP ${kp.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return {
      processed: kps.length,
      totalCreated,
      totalDeduped,
    };
  }

  /**
   * Get statistics on atomicity status
   */
  async getStats(filter?: {
    topicId?: string;
    subtopicId?: string;
  }): Promise<AtomicityStats> {
    const where: Prisma.KnowledgePointWhereInput = {
      AND: [
        filter?.topicId ? { topicId: filter.topicId } : {},
        filter?.subtopicId ? { subtopicId: filter.subtopicId } : {},
      ].filter((w) => Object.keys(w).length > 0),
    };

    const [total, unchecked, atomic, nonAtomic, failed, active, inactive] =
      await Promise.all([
        this.prisma.knowledgePoint.count({ where }),
        this.prisma.knowledgePoint.count({
          where: { ...where, atomicityStatus: AtomicityStatus.UNCHECKED },
        }),
        this.prisma.knowledgePoint.count({
          where: { ...where, atomicityStatus: AtomicityStatus.ATOMIC },
        }),
        this.prisma.knowledgePoint.count({
          where: { ...where, atomicityStatus: AtomicityStatus.NON_ATOMIC },
        }),
        this.prisma.knowledgePoint.count({
          where: { ...where, atomicityStatus: AtomicityStatus.FAILED },
        }),
        this.prisma.knowledgePoint.count({
          where: { ...where, isActive: true },
        }),
        this.prisma.knowledgePoint.count({
          where: { ...where, isActive: false },
        }),
      ]);

    return {
      total,
      unchecked,
      atomic,
      nonAtomic,
      failed,
      active,
      inactive,
    };
  }

  /**
   * Get children of a split KP
   */
  async getSplitChildren(parentId: string): Promise<KnowledgePoint[]> {
    return await this.prisma.knowledgePoint.findMany({
      where: { splitFromId: parentId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
