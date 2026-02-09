/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConceptService } from '../../concept/concept.service';
import {
  UnresolvedHintStatus,
  AliasSource,
  ConceptStatus,
} from '@prisma/client';
import {
  ListUnresolvedHintsDto,
  CreateConceptFromHintDto,
  AddAliasFromHintDto,
  IgnoreHintDto,
  BulkIgnoreHintsDto,
} from './dto';
import { normalizeConceptKey } from '../../common/normalize/normalize-concept-key';

@Injectable()
export class UnresolvedHintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conceptService: ConceptService,
  ) {}

  async listUnresolvedHints(query: ListUnresolvedHintsDto) {
    const {
      status = UnresolvedHintStatus.PENDING,
      lesson,
      topic,
      limit = 50,
      offset = 0,
      sortBy = 'count',
      sortOrder = 'desc',
    } = query;

    const where: {
      status: UnresolvedHintStatus;
      lesson?: string;
      topic?: string;
    } = { status };
    if (lesson) where.lesson = lesson;
    if (topic) where.topic = topic;

    const orderBy: {
      count?: 'asc' | 'desc';
      createdAt?: 'asc' | 'desc';
    } = {};
    if (sortBy === 'count') orderBy.count = sortOrder;
    else if (sortBy === 'createdAt') orderBy.createdAt = sortOrder;

    const [hints, total] = await Promise.all([
      this.prisma.unresolvedConceptHint.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
      this.prisma.unresolvedConceptHint.count({ where }),
    ]);

    return {
      hints,
      total,
      limit,
      offset,
    };
  }

  async getStatistics() {
    const [totalPending, totalResolved, totalIgnored, byLesson, topHints] =
      await Promise.all([
        this.prisma.unresolvedConceptHint.count({
          where: { status: UnresolvedHintStatus.PENDING },
        }),
        this.prisma.unresolvedConceptHint.count({
          where: { status: UnresolvedHintStatus.RESOLVED },
        }),
        this.prisma.unresolvedConceptHint.count({
          where: { status: UnresolvedHintStatus.IGNORED },
        }),
        this.prisma.unresolvedConceptHint.groupBy({
          by: ['lessonId'],
          where: { status: UnresolvedHintStatus.PENDING },
          _count: true,
          _sum: { count: true },
        }),
        this.prisma.unresolvedConceptHint.findMany({
          where: { status: UnresolvedHintStatus.PENDING },
          orderBy: { count: 'desc' },
          take: 10,
        }),
      ]);

    return {
      totalPending,
      totalResolved,
      totalIgnored,
      byLesson: byLesson.map(async (item) => {
        if (!item.lessonId) {
          return {
            lesson: 'Unknown',
            hintCount: item._count,
            totalOccurrences: item._sum.count || 0,
          };
        }
        const lesson = await this.prisma.lesson.findUnique({
          where: { id: item.lessonId },
        });
        return {
          lesson: lesson?.name || item.lessonId,
          hintCount: item._count,
          totalOccurrences: item._sum.count || 0,
        };
      }),
      topHints: topHints.map(async (h) => {
        if (!h.lessonId) {
          return {
            id: h.id,
            hint: h.hint,
            lesson: 'Unknown',
            count: h.count,
          };
        }
        const lesson = await this.prisma.lesson.findUnique({
          where: { id: h.lessonId },
        });
        return {
          id: h.id,
          hint: h.hint,
          lesson: lesson?.name || h.lessonId,
          count: h.count,
        };
      }),
    };
  }

  async createConceptFromHint(id: string, dto: CreateConceptFromHintDto) {
    const hint = await this.prisma.unresolvedConceptHint.findUnique({
      where: { id },
    });

    if (!hint) {
      throw new NotFoundException(`Unresolved hint with ID ${id} not found`);
    }

    if (hint.status !== UnresolvedHintStatus.PENDING) {
      throw new NotFoundException(`Hint is already ${hint.status}`);
    }

    const normalizedLabel = normalizeConceptKey(dto.preferredLabel);

    // Check if concept already exists
    const existing = await this.prisma.concept.findUnique({
      where: { normalizedLabel },
    });

    if (existing) {
      throw new Error(
        `Concept with label "${dto.preferredLabel}" already exists`,
      );
    }

    // Create concept with transaction
    const concept = await this.prisma.$transaction(async (tx) => {
      // Create the concept
      const newConcept = await tx.concept.create({
        data: {
          preferredLabel: dto.preferredLabel,
          normalizedLabel,
          conceptType: dto.conceptType,
          description: dto.description,
          status: ConceptStatus.ACTIVE,
        },
      });

      // Add the hint as an alias
      const normalizedHint = normalizeConceptKey(hint.hint);
      if (normalizedHint !== normalizedLabel) {
        await tx.conceptAlias.create({
          data: {
            conceptId: newConcept.id,
            alias: hint.hint,
            normalizedAlias: normalizedHint,
            language: dto.aliasLanguage || 'EN',
            source: AliasSource.ADMIN,
            isActive: true,
          },
        });
      }

      if (hint.questionId) {
        await tx.questionConcept.create({
          data: {
            conceptId: newConcept.id,
            questionId: hint.questionId,
          },
        });
      }

      // Add additional aliases if provided
      if (dto.additionalAliases && dto.additionalAliases.length > 0) {
        for (const alias of dto.additionalAliases) {
          const normalized = normalizeConceptKey(alias);
          if (normalized !== normalizedLabel && normalized !== normalizedHint) {
            await tx.conceptAlias.create({
              data: {
                conceptId: newConcept.id,
                alias,
                normalizedAlias: normalized,
                language: dto.aliasLanguage || 'EN',
                source: AliasSource.ADMIN,
                isActive: true,
              },
            });
          }
        }
      }

      // Mark hint as resolved
      await tx.unresolvedConceptHint.update({
        where: { id },
        data: { status: UnresolvedHintStatus.RESOLVED },
      });

      return newConcept;
    });

    return {
      message: 'Concept created successfully',
      concept,
    };
  }

  async addAliasFromHint(id: string, dto: AddAliasFromHintDto) {
    const hint = await this.prisma.unresolvedConceptHint.findUnique({
      where: { id },
    });

    if (!hint) {
      throw new NotFoundException(`Unresolved hint with ID ${id} not found`);
    }

    if (hint.status !== UnresolvedHintStatus.PENDING) {
      throw new NotFoundException(`Hint is already ${hint.status}`);
    }

    const concept = await this.prisma.concept.findUnique({
      where: { id: dto.conceptId },
    });

    if (!concept) {
      throw new NotFoundException(`Concept with ID ${dto.conceptId} not found`);
    }

    const normalizedAlias = normalizeConceptKey(hint.hint);

    // Check if alias already exists
    const existingAlias = await this.prisma.conceptAlias.findUnique({
      where: { normalizedAlias },
    });

    if (existingAlias) {
      throw new Error(`Alias "${hint.hint}" already exists`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Add alias
      await tx.conceptAlias.create({
        data: {
          conceptId: dto.conceptId,
          alias: hint.hint,
          normalizedAlias,
          language: dto.aliasLanguage || 'EN',
          source: AliasSource.ADMIN,
          isActive: true,
        },
      });

      // Mark hint as resolved
      await tx.unresolvedConceptHint.update({
        where: { id },
        data: { status: UnresolvedHintStatus.RESOLVED },
      });
    });

    return {
      message: 'Alias added successfully',
      conceptId: dto.conceptId,
    };
  }

  async ignoreHint(id: string, dto: IgnoreHintDto) {
    const hint = await this.prisma.unresolvedConceptHint.findUnique({
      where: { id },
    });

    if (!hint) {
      throw new NotFoundException(`Unresolved hint with ID ${id} not found`);
    }

    if (hint.status !== UnresolvedHintStatus.PENDING) {
      throw new NotFoundException(`Hint is already ${hint.status}`);
    }

    await this.prisma.unresolvedConceptHint.update({
      where: { id },
      data: { status: UnresolvedHintStatus.IGNORED },
    });

    return {
      message: 'Hint ignored successfully',
      reason: dto.reason,
    };
  }
  async bulkIgnoreHints(dto: BulkIgnoreHintsDto) {
    const { hintIds, reason } = dto;

    // Validate all hints exist and are PENDING
    const hints = await this.prisma.unresolvedConceptHint.findMany({
      where: {
        id: { in: hintIds },
      },
    });

    if (hints.length !== hintIds.length) {
      throw new NotFoundException(
        `Some hints not found. Expected ${hintIds.length}, found ${hints.length}`,
      );
    }

    const nonPendingHints = hints.filter(
      (h) => h.status !== UnresolvedHintStatus.PENDING,
    );
    if (nonPendingHints.length > 0) {
      throw new NotFoundException(
        `Some hints are not PENDING: ${nonPendingHints.map((h) => h.hint).join(', ')}`,
      );
    }

    // Bulk update to IGNORED status
    const result = await this.prisma.unresolvedConceptHint.updateMany({
      where: {
        id: { in: hintIds },
      },
      data: {
        status: UnresolvedHintStatus.IGNORED,
        updatedAt: new Date(),
      },
    });

    return {
      message: `Successfully ignored ${result.count} hints`,
      ignoredCount: result.count,
      reason: reason || 'No reason provided',
    };
  }

  async bulkApproveHints(dto: BulkIgnoreHintsDto & { conceptId: string }) {
    const { hintIds, conceptId } = dto;

    // Validate concept exists
    const concept = await this.prisma.concept.findUnique({
      where: { id: conceptId },
    });

    if (!concept) {
      throw new NotFoundException(`Concept with ID ${conceptId} not found`);
    }

    // Validate all hints exist and are PENDING
    const hints = await this.prisma.unresolvedConceptHint.findMany({
      where: {
        id: { in: hintIds },
      },
    });

    if (hints.length !== hintIds.length) {
      throw new NotFoundException(
        `Some hints not found. Expected ${hintIds.length}, found ${hints.length}`,
      );
    }

    const nonPendingHints = hints.filter(
      (h) => h.status !== UnresolvedHintStatus.PENDING,
    );
    if (nonPendingHints.length > 0) {
      throw new NotFoundException(
        `Some hints are not PENDING: ${nonPendingHints.map((h) => h.hint).join(', ')}`,
      );
    }

    // Process all hints in transaction
    const results = await this.prisma.$transaction(async (tx) => {
      let addedAliases = 0;
      let skippedDuplicates = 0;
      const linkedQuestions = new Set<string>();

      for (const hint of hints) {
        const normalizedAlias = normalizeConceptKey(hint.hint);

        // Check if alias already exists
        const existingAlias = await tx.conceptAlias.findUnique({
          where: { normalizedAlias },
        });

        if (existingAlias) {
          skippedDuplicates++;
        } else {
          // Add alias
          await tx.conceptAlias.create({
            data: {
              conceptId,
              alias: hint.hint,
              normalizedAlias,
              language: 'EN',
              source: AliasSource.ADMIN,
              isActive: true,
            },
          });
          addedAliases++;
        }

        // Link question if exists
        if (hint.questionId) {
          linkedQuestions.add(hint.questionId);
          const existingLink = await tx.questionConcept.findUnique({
            where: {
              questionId_conceptId: {
                questionId: hint.questionId,
                conceptId,
              },
            },
          });

          if (!existingLink) {
            await tx.questionConcept.create({
              data: {
                conceptId,
                questionId: hint.questionId,
              },
            });
          }
        }

        // Mark hint as resolved
        await tx.unresolvedConceptHint.update({
          where: { id: hint.id },
          data: { status: UnresolvedHintStatus.RESOLVED },
        });
      }

      return {
        addedAliases,
        skippedDuplicates,
        linkedQuestions: linkedQuestions.size,
      };
    });

    return {
      message: `Successfully approved ${hintIds.length} hints`,
      conceptId,
      conceptLabel: concept.preferredLabel,
      ...results,
    };
  }

  /**
   * Record unresolved hint from question analysis
   */
  async recordUnresolvedHint(params: {
    hint: string;
    questionId?: string;
    lessonId: string;
    topicId: string;
    subtopicId: string;
  }) {
    const { hint, questionId, topicId, subtopicId } = params;

    const existing = await this.prisma.unresolvedConceptHint.findUnique({
      where: {
        normalizedHint_topicId_subtopicId: {
          normalizedHint: normalizeConceptKey(hint),
          topicId,
          subtopicId,
        },
      },
    });

    if (existing) {
      // ❗ IGNORE edilmişse dokunma
      if (existing.status === UnresolvedHintStatus.IGNORED) {
        return;
      }

      await this.prisma.unresolvedConceptHint.update({
        where: { id: existing.id },
        data: {
          count: { increment: 1 },
          updatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.unresolvedConceptHint.create({
        data: {
          hint,
          normalizedHint: normalizeConceptKey(hint),
          questionId,
          lessonId: params.lessonId,
          topicId: params.topicId,
          subtopicId: params.subtopicId,
          source: 'QUESTION_ANALYSIS',
          count: 1,
          status: UnresolvedHintStatus.PENDING,
        },
      });
    }
  }
}
