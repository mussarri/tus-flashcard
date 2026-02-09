/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from '../queue/queues';
import { GenerationMode } from './dto/generate-topic.dto';
import { AIProviderType } from '@prisma/client';
import { AuditLogService } from '../common/services/audit-log.service';
import { VisualAssetService } from '../common/services/visual-asset.service';
import { AIRouterService } from '../ai/ai-router.service';
import { buildTopicValidationPrompt } from '../ai/prompts/topic-validation.prompt';
import {
  FlashcardListQueryDto,
  BindVisualDto,
  VisualStatus,
} from './dto/flashcard-visual.dto';
import { StateMachineValidator } from '../common/validators/state-machine.validator';
import { ExamQuestionService } from '../exam-question/exam-question.service';
import { ExamQuestionSimilarityService } from '../exam-question/exam-question-similarity.service';
import { ExamQuestionRegistryService } from '../exam-question/exam-question-registry.service';
import { PrerequisiteLearningService } from '../exam-question/prerequisite-learning.service';
import { BulkParserService } from '../exam-question/bulk-parser.service';
import {
  CreateExamQuestionDto,
  UpdateExamQuestionDto,
  ExamQuestionListQueryDto,
} from './dto/exam-question.dto';
import { UpdateAITaskConfigDto } from './dto/ai-config.dto';
import { PrerequisiteQueryDto } from './dto/prerequisite-query.dto';
import {
  PrerequisiteDetailQueryDto,
  PrerequisiteDetailResponseDto,
} from './dto/prerequisite-detail.dto';
import { AITaskType } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QueueName.FLASHCARD_GENERATION)
    private readonly flashcardGenerationQueue: Queue,
    @InjectQueue(QueueName.QUESTION_GENERATION)
    private readonly questionGenerationQueue: Queue,
    @InjectQueue(QueueName.KNOWLEDGE_EXTRACTION)
    private readonly knowledgeExtractionQueue: Queue,
    @InjectQueue(QueueName.EXAM_QUESTION_ANALYSIS)
    private readonly examQuestionAnalysisQueue: Queue,
    private readonly auditLogService: AuditLogService,
    private readonly visualAssetService: VisualAssetService,
    private readonly examQuestionService: ExamQuestionService,
    private readonly examQuestionSimilarityService: ExamQuestionSimilarityService,
    private readonly examQuestionRegistryService: ExamQuestionRegistryService,
    private readonly prerequisiteLearningService: PrerequisiteLearningService,
    private readonly bulkParserService: BulkParserService,
    @Inject(forwardRef(() => AIRouterService))
    private readonly aiRouter: AIRouterService,
  ) {}

  private edgeStrengthFromFrequency(frequency: number) {
    if (frequency >= 10) return 'STRONG';
    if (frequency >= 4) return 'MEDIUM';
    return 'WEAK';
  }

  /**
   * Generate flashcards for all knowledge points in a topic
   * @param topicId - The topic ID (subcategory)
   * @param mode - Generation mode (append or replace)
   * @param providerOverride - Optional provider override (OPENAI or GEMINI)
   */
  async generateFlashcardsForTopic(
    topicId: string,
    mode: GenerationMode = GenerationMode.APPEND,
    providerOverride?: AIProviderType,
    adminUserId?: string,
  ): Promise<{
    queued: number;
    skipped: number;
    deleted: number;
    coverage: {
      total: number;
      used: number;
      skipped: number;
      reasons: Record<string, number>;
    };
  }> {
    this.logger.log(
      `Generating flashcards for topic: ${topicId} (mode: ${mode})`,
    );

    // Check prerequisite requirements for advanced content generation
    const shouldBlock =
      await this.prerequisiteLearningService.shouldBlockAdvancedContentGeneration(
        topicId,
      );
    if (shouldBlock) {
      throw new BadRequestException(
        `Cannot generate advanced flashcards for topic "${topicId}" - missing STRONG prerequisite knowledge. Please ensure prerequisite topics are learned first.`,
      );
    }

    // Find all knowledge points for this topic
    const knowledgePoints = await this.prisma.knowledgePoint.findMany({
      where: {
        topicId: topicId,
      },
      include: {
        flashcards: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (knowledgePoints.length === 0) {
      throw new NotFoundException(
        `No knowledge points found for topic: ${topicId}`,
      );
    }

    const totalKnowledgePoints = knowledgePoints.length;
    let queued = 0;
    let skipped = 0;
    let deleted = 0;
    const skipReasons: Record<string, number> = {};

    for (const kp of knowledgePoints) {
      // If replace mode, delete existing flashcards first
      // If replace mode, delete existing flashcards first
      if (mode === GenerationMode.REPLACE && kp.flashcards.length > 0) {
        const deleteResult = await this.prisma.flashcard.deleteMany({
          where: { knowledgePointId: kp.id },
        });
        deleted += deleteResult.count;
        this.logger.debug(
          `Deleted ${deleteResult.count} existing flashcards for knowledge point: ${kp.id}`,
        );
      }

      // Skip if append mode and flashcards already exist
      if (mode === GenerationMode.APPEND && kp.flashcards.length > 0) {
        skipped++;
        skipReasons['already_has_flashcards'] =
          (skipReasons['already_has_flashcards'] || 0) + 1;
        this.logger.debug(
          `Skipping knowledge point ${kp.id} - already has ${kp.flashcards.length} flashcards`,
        );
        continue;
      }

      // Check if knowledge point has a valid lesson (category)
      if (!kp.topicId) {
        skipped++;
        skipReasons['no_lesson'] = (skipReasons['no_lesson'] || 0) + 1;
        this.logger.debug(
          `Skipping knowledge point ${kp.id} - no lesson (category) assigned`,
        );
        continue;
      }

      // Queue flashcard generation job with optional provider override
      try {
        if (!this.flashcardGenerationQueue) {
          throw new Error('Flashcard generation queue not available');
        }

        // Remove existing completed/failed job if exists to allow re-processing
        const jobId = `flashcard-${kp.id}`;
        const existingJob = await this.flashcardGenerationQueue.getJob(jobId);
        if (existingJob) {
          const state = await existingJob.getState();
          if (state === 'completed' || state === 'failed') {
            this.logger.debug(
              `Removing existing ${state} job for knowledgePoint ${kp.id}`,
            );
            await existingJob.remove();
          } else if (state === 'waiting' || state === 'active') {
            this.logger.debug(
              `Job already ${state} for knowledgePoint ${kp.id}, skipping`,
            );
            skipped++;
            skipReasons['job_already_in_progress'] =
              (skipReasons['job_already_in_progress'] || 0) + 1;
            continue;
          }
        }

        const job = await this.flashcardGenerationQueue.add(
          QueueName.FLASHCARD_GENERATION,
          {
            knowledgePointId: kp.id,
            ...(providerOverride && { provider: providerOverride }),
          },
          {
            jobId,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        );
        queued++;
        this.logger.debug(
          `Queued flashcard generation for knowledge point: ${kp.id} (jobId=${job?.id}, name=${job?.name})`,
        );
        if (!job) {
          // If add returned falsy (unexpected), mark as skipped for visibility
          skipped++;
          skipReasons['queue_returned_no_job'] =
            (skipReasons['queue_returned_no_job'] || 0) + 1;
        }
        try {
          const fetched = await this.flashcardGenerationQueue.getJob(
            job.id as string,
          );
          if (!fetched) {
            this.logger.error(
              `Job was added but not found in queue for knowledgePoint ${kp.id}: jobId=${job?.id}`,
            );
            skipReasons['queue_job_not_found'] =
              (skipReasons['queue_job_not_found'] || 0) + 1;
          } else {
            const state = await fetched.getState();
            this.logger.debug(
              `Verified job present in queue for knowledgePoint ${kp.id}: jobId=${fetched.id}, state=${state}`,
            );
          }
        } catch (err) {
          this.logger.error(
            `Error verifying job in queue for knowledgePoint ${kp.id}: ${err instanceof Error ? err.message : 'Unknown error'}`,
          );
        }
      } catch (error) {
        skipped++;
        skipReasons['queue_failed'] = (skipReasons['queue_failed'] || 0) + 1;
        this.logger.error(
          `Failed to queue flashcard generation for knowledge point ${kp.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    const coverage = {
      total: totalKnowledgePoints,
      used: queued,
      skipped,
      reasons: skipReasons,
    };

    this.logger.log(
      `Flashcard generation queued for topic ${topicId}${providerOverride ? ` with provider ${providerOverride}` : ''}: ${queued} queued, ${skipped} skipped, ${deleted} deleted`,
    );

    // Audit log
    if (adminUserId) {
      await this.auditLogService.logAction({
        adminUserId,
        actionType: 'FLASHCARD_GENERATION',
        actionMode: mode,
        provider: providerOverride,
        topicId: topicId,
        success: true,
        resultCount: queued,
        skippedCount: skipped,
        deletedCount: deleted,
        metadata: { coverage },
      });
    }

    return { queued, skipped, deleted, coverage };
  }

  /**
   * Generate flashcards for specific knowledge points (batch)
   * @param knowledgePointIds - Array of knowledge point IDs
   * @param providerOverride - Optional provider override (OPENAI or GEMINI)
   */
  async generateFlashcardsForKnowledgePoints(
    knowledgePointIds: string[],
    providerOverride?: AIProviderType,
  ): Promise<{
    queued: number;
    skipped: number;
    deleted: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    this.logger.log(
      `Generating flashcards for ${knowledgePointIds.length} knowledge points`,
    );

    let queued = 0;
    let skipped = 0;
    const deleted = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const kpId of knowledgePointIds) {
      try {
        // Check if knowledge point exists
        const kp = await this.prisma.knowledgePoint.findUnique({
          where: { id: kpId },
          include: {
            flashcards: {
              select: { id: true },
              take: 1,
            },
          },
        });

        if (!kp) {
          errors.push({ id: kpId, error: 'Knowledge point not found' });
          skipped++;
          continue;
        }

        // Skip if flashcards already exist
        if (kp.flashcards.length > 0) {
          this.logger.debug(
            `Skipping knowledge point ${kpId} - already has flashcards`,
          );
          skipped++;
          continue;
        }

        // Queue flashcard generation job
        if (!this.flashcardGenerationQueue) {
          throw new Error('Flashcard generation queue not available');
        }

        // Remove existing completed/failed job if exists to allow re-processing
        const jobId = `flashcard-${kpId}`;
        const existingJob = await this.flashcardGenerationQueue.getJob(jobId);
        if (existingJob) {
          const state = await existingJob.getState();
          if (state === 'completed' || state === 'failed') {
            this.logger.debug(
              `Removing existing ${state} job for knowledgePoint ${kpId}`,
            );
            await existingJob.remove();
          } else if (state === 'waiting' || state === 'active') {
            this.logger.debug(
              `Job already ${state} for knowledgePoint ${kpId}, skipping`,
            );
            skipped++;
            continue;
          }
        }

        const job = await this.flashcardGenerationQueue.add(
          'flashcard-generation',
          {
            knowledgePointId: kpId,
            ...(providerOverride && { provider: providerOverride }),
          },
          {
            jobId,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        );
        this.logger.debug(
          `Queued flashcard generation for knowledge point: ${kpId} (jobId=${job?.id}, name=${job?.name})`,
        );

        if (!job) {
          this.logger.error(`Queue returned no job for knowledgePoint ${kpId}`);
          skipped++;
        } else {
          queued++;
          try {
            const fetched = await this.flashcardGenerationQueue.getJob(
              job.id as string,
            );
            if (!fetched) {
              this.logger.error(
                `Job was added but not found in queue for knowledgePoint ${kpId}: jobId=${job?.id}`,
              );
              skipped++;
              queued--;
            } else {
              const state = await fetched.getState();
              this.logger.debug(
                `Verified job present in queue for knowledgePoint ${kpId}: jobId=${fetched.id}, state=${state}`,
              );
            }
          } catch (err) {
            this.logger.error(
              `Error verifying job in queue for knowledgePoint ${kpId}: ${err instanceof Error ? err.message : 'Unknown error'}`,
            );
          }
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push({ id: kpId, error: errorMsg });
        skipped++;
        this.logger.error(
          `Failed to queue flashcard generation for ${kpId}: ${errorMsg}`,
        );
      }
    }

    return {
      queued,
      skipped,
      deleted,
      errors,
    };
  }

  /**
   * Generate questions for all knowledge points in a topic
   * @param topicId - The topic ID
   * @param mode - Generation mode (append or replace)
   * @param providerOverride - Optional provider override (OPENAI or GEMINI)
   */
  async generateQuestionsForTopic(
    topicId: string,
    mode: GenerationMode = GenerationMode.APPEND,
    providerOverride?: AIProviderType,
  ): Promise<{ queued: number; skipped: number; deleted: number }> {
    this.logger.log(
      `Generating questions for topic: ${topicId} (mode: ${mode})`,
    );

    // Find all knowledge points for this topic
    const knowledgePoints = await this.prisma.knowledgePoint.findMany({
      where: {
        topicId: topicId,
      },
      include: {
        questionKnowledgePoints: {
          where: {
            relationshipType: 'MEASURED',
          },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (knowledgePoints.length === 0) {
      throw new NotFoundException(
        `No knowledge points found for topic: ${topicId}`,
      );
    }

    let queued = 0;
    let skipped = 0;
    let deleted = 0;

    for (const kp of knowledgePoints) {
      // If replace mode, delete existing questions first
      if (
        mode === GenerationMode.REPLACE &&
        kp.questionKnowledgePoints.length > 0
      ) {
        // Delete GeneratedQuestions linked to this knowledge point
        const questionsToDelete = await this.prisma.questionCard.findMany({
          where: {
            questionKnowledgePoints: {
              some: {
                knowledgePointId: kp.id,
                relationshipType: 'MEASURED',
              },
            },
          },
          select: { id: true },
        });

        for (const question of questionsToDelete) {
          // Delete will cascade to QuestionKnowledgePoint
          await this.prisma.questionCard.delete({
            where: { id: question.id },
          });
        }
        deleted += questionsToDelete.length;
        this.logger.debug(
          `Deleted ${questionsToDelete.length} existing questions for knowledge point: ${kp.id}`,
        );
      }

      // Skip if append mode and questions already exist
      if (
        mode === GenerationMode.APPEND &&
        kp.questionKnowledgePoints.length > 0
      ) {
        skipped++;
        this.logger.debug(
          `Skipping knowledge point ${kp.id} - already has ${kp.questionKnowledgePoints.length} questions`,
        );
        continue;
      }

      // Queue question generation job with optional provider override
      try {
        await this.questionGenerationQueue.add(
          'generate-question',
          {
            knowledgePointId: kp.id,
            ...(providerOverride && { provider: providerOverride }),
          },
          {
            jobId: `question-${kp.id}`,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        );
        queued++;
        this.logger.debug(
          `Queued question generation for knowledge point: ${kp.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to queue question generation for knowledge point ${kp.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    this.logger.log(
      `Question generation queued for topic ${topicId}${providerOverride ? ` with provider ${providerOverride}` : ''}: ${queued} queued, ${skipped} skipped, ${deleted} deleted`,
    );

    return { queued, skipped, deleted };
  }

  /**
   * Get list of available topics with filters
   */
  async getTopics(filters?: {
    lessonId?: string;
    topicId?: string;
    search?: string;
  }) {
    /** --------------------
     * LESSONS
     * ------------------- */
    const lessons = await this.prisma.lesson.findMany({
      where: filters?.lessonId ? { id: filters.lessonId } : undefined,
      orderBy: { name: 'asc' },
    });

    const lessonCounts = await this.prisma.examQuestion.groupBy({
      by: ['lessonId'],
      _count: { _all: true },
    });

    const lessonCountMap = new Map(
      lessonCounts.map((l) => [l.lessonId, l._count._all]),
    );

    /** --------------------
     * TOPICS
     * ------------------- */
    const topicWhere: any = {};
    if (filters?.lessonId) topicWhere.lessonId = filters.lessonId;
    if (filters?.search) {
      topicWhere.OR = [
        {
          name: {
            contains: filters.search,
            mode: 'insensitive',
            mergedIntoId: null,
          },
        },
        { displayName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const topics = await this.prisma.topic.findMany({
      where: Object.keys(topicWhere).length > 0 ? topicWhere : undefined,
      orderBy: { name: 'asc' },
    });

    const topicCounts = await this.prisma.examQuestion.groupBy({
      by: ['topicId'],
      _count: { _all: true },
      where: filters?.lessonId ? { lessonId: filters.lessonId } : undefined,
    });

    const topicCountMap = new Map(
      topicCounts
        .filter((t) => t.topicId !== null)
        .map((t) => [t.topicId!, t._count._all]),
    );

    /** --------------------
     * SUBTOPICS
     * ------------------- */
    const subtopicWhere: any = {};
    if (filters?.topicId) subtopicWhere.topicId = filters.topicId;
    if (filters?.search) {
      subtopicWhere.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { displayName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const subtopics = await this.prisma.subtopic.findMany({
      where: Object.keys(subtopicWhere).length > 0 ? subtopicWhere : undefined,
      orderBy: { name: 'asc' },
    });

    const subtopicCounts = await this.prisma.examQuestion.groupBy({
      by: ['subtopicId'],
      _count: { _all: true },
      where: filters?.topicId ? { topicId: filters.topicId } : undefined,
    });

    const subtopicCountMap = new Map(
      subtopicCounts.map((s) => [s.subtopicId, s._count._all]),
    );
    console.log(subtopicCountMap);
    /** --------------------
     * RESPONSE
     * ------------------- */
    return {
      lessons: lessons.map((l) => ({
        id: l.id,
        name: l.name,
        displayName: l.displayName,
        questionCount: lessonCountMap.get(l.id) ?? 0,
      })),

      topics: topics.map((t) => ({
        id: t.id,
        name: t.name,
        displayName: t.displayName,
        lessonId: t.lessonId,
        questionCount: topicCountMap.get(t.id) ?? 0,
      })),

      subtopics: subtopics.map((s) => ({
        id: s.id,
        name: s.name,
        displayName: s.displayName,
        topicId: s.topicId,
        questionCount: subtopicCountMap.get(s.id) ?? 0,
      })),
    };
  }

  /**
   * Merge two topics with full transaction safety
   * Following strict merge protocol:
   * 1. Pre-flight validation
   * 2. Move questions to target
   * 3. Aggregate prerequisite edges
   * 4. Update content references
   * 5. Mark source as MERGED
   * 6. Post-merge validation
   */
  async mergeTopics(payload: {
    lessonId: string;
    sourceTopicId: string;
    targetTopicId: string;
  }) {
    const { lessonId, sourceTopicId, targetTopicId } = payload;

    // ==========================================
    // 0️⃣ PRE-FLIGHT CHECKS
    // ==========================================
    if (!lessonId || !sourceTopicId || !targetTopicId) {
      throw new BadRequestException(
        'lessonId, sourceTopicId and targetTopicId are required',
      );
    }

    if (sourceTopicId === targetTopicId) {
      throw new BadRequestException('Cannot merge topic into itself');
    }

    // Fetch topics
    const [source, target] = await Promise.all([
      this.prisma.topic.findUnique({
        where: { id: sourceTopicId },
        include: { prerequisiteEdges: true },
      }),
      this.prisma.topic.findUnique({
        where: { id: targetTopicId },
        include: { prerequisiteEdges: true },
      }),
    ]);

    if (!source) {
      throw new NotFoundException(`Source topic not found: ${sourceTopicId}`);
    }

    if (!target) {
      throw new NotFoundException(`Target topic not found: ${targetTopicId}`);
    }

    if (source.lessonId !== lessonId || target.lessonId !== lessonId) {
      throw new BadRequestException(
        'Source and target topics must belong to the same lesson',
      );
    }

    if (source.status === 'MERGED') {
      throw new BadRequestException('Source topic is already merged');
    }

    if (target.status === 'MERGED') {
      throw new BadRequestException('Target topic is already merged');
    }

    this.logger.log(
      `Starting topic merge: ${source.name} → ${target.name} (lesson: ${lessonId})`,
    );

    let movedQuestions = 0;
    let mergedEdges = 0;

    // ==========================================
    // 🔒 TRANSACTION
    // ==========================================
    await this.prisma.$transaction(async (tx) => {
      // ==========================================
      // 1️⃣ MOVE QUESTIONS
      // ==========================================
      const questionsResult = await tx.examQuestion.updateMany({
        where: {
          lessonId: lessonId, // string lesson
          topicId: source.id,
        },
        data: {
          topicId: target.id,
        },
      });

      movedQuestions = questionsResult.count;

      // ==========================================
      // 2️⃣ MERGE PREREQUISITE EDGES
      // ==========================================
      const sourceEdges = await tx.prerequisiteTopicEdge.findMany({
        where: { topicId: source.id },
      });

      for (const sourceEdge of sourceEdges) {
        const targetEdge = await tx.prerequisiteTopicEdge.findUnique({
          where: {
            prerequisiteId_topicId: {
              prerequisiteId: sourceEdge.prerequisiteId,
              topicId: target.id,
            },
          },
        });

        if (targetEdge) {
          const mergedFrequency = targetEdge.frequency + sourceEdge.frequency;

          await tx.prerequisiteTopicEdge.update({
            where: { id: targetEdge.id },
            data: {
              frequency: mergedFrequency,
              strength: this.edgeStrengthFromFrequency(mergedFrequency),
              lastUpdatedAt: new Date(),
            },
          });

          await tx.prerequisiteTopicEdge.delete({
            where: { id: sourceEdge.id },
          });

          mergedEdges++;
        } else {
          await tx.prerequisiteTopicEdge.update({
            where: { id: sourceEdge.id },
            data: {
              topicId: target.id,
              lastUpdatedAt: new Date(),
            },
          });
        }
      }

      // ==========================================
      // 3️⃣ NORMALIZE SUBTOPICS
      // ==========================================
      const sourceSubtopics = await tx.subtopic.findMany({
        where: { topicId: source.id },
        select: { id: true, name: true },
      });

      for (const subtopic of sourceSubtopics) {
        const existingTargetSubtopic = await tx.subtopic.findUnique({
          where: {
            name_topicId: {
              name: subtopic.name,
              topicId: target.id,
            },
          },
        });

        if (existingTargetSubtopic) {
          // Move questions
          await tx.examQuestion.updateMany({
            where: {
              lessonId: lessonId,
              topicId: target.id,
              subtopicId: subtopic.id,
            },
            data: {
              subtopicId: existingTargetSubtopic.id,
            },
          });

          await tx.subtopic.delete({
            where: { id: subtopic.id },
          });
        } else {
          await tx.subtopic.update({
            where: { id: subtopic.id },
            data: { topicId: target.id },
          });
        }
      }

      // ==========================================
      // 4️⃣ MARK SOURCE AS MERGED
      // ==========================================
      await tx.topic.update({
        where: { id: source.id },
        data: {
          status: 'MERGED',
          mergedIntoId: target.id,
          updatedAt: new Date(),
        },
      });

      // ==========================================
      // 5️⃣ VALIDATION
      // ==========================================
      const remainingQuestions = await tx.examQuestion.count({
        where: {
          lessonId: lessonId,
          topicId: source.id,
        },
      });

      if (remainingQuestions > 0) {
        throw new Error(
          `VALIDATION FAILED: ${remainingQuestions} questions still reference source topic`,
        );
      }

      const remainingEdges = await tx.prerequisiteTopicEdge.count({
        where: { topicId: source.id },
      });

      if (remainingEdges > 0) {
        throw new Error(
          `VALIDATION FAILED: ${remainingEdges} prerequisite edges still reference source topic`,
        );
      }
    });

    // ==========================================
    // ✅ DONE
    // ==========================================
    this.logger.log(`Topic merge completed: ${source.name} → ${target.name}`);

    return {
      success: true,
      lessonId,
      sourceTopicId,
      targetTopicId,
      statistics: {
        movedQuestions,
        mergedEdges,
      },
    };
  }

  async mergeSubtopics(payload: {
    lessonId: string;
    topicId: string;
    sourceSubtopicId: string;
    targetSubtopicId: string;
  }) {
    const { lessonId, topicId, sourceSubtopicId, targetSubtopicId } = payload;

    if (!lessonId || !topicId || !sourceSubtopicId || !targetSubtopicId) {
      throw new BadRequestException(
        'lessonId, topicId, sourceSubtopicId, and targetSubtopicId are required',
      );
    }

    if (sourceSubtopicId === targetSubtopicId) {
      throw new BadRequestException(
        'sourceSubtopicId and targetSubtopicId must be different',
      );
    }

    const [source, target] = await Promise.all([
      this.prisma.subtopic.findUnique({
        where: {
          id: sourceSubtopicId,
        },
      }),
      this.prisma.subtopic.findUnique({
        where: {
          id: targetSubtopicId,
        },
      }),
    ]);

    if (!source || !target) {
      throw new NotFoundException('Source or target subtopic not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.examQuestion.updateMany({
        where: {
          lessonId,
          topicId,
          subtopicId: sourceSubtopicId,
        },
        data: {
          subtopicId: targetSubtopicId,
        },
      });

      //questioncard subtopic update
      await tx.questionCard.updateMany({
        where: {
          lessonId,
          topicId,
          subtopicId: sourceSubtopicId,
        },
        data: {
          subtopicId: targetSubtopicId,
        },
      });

      //knowledgepoint topic update
      await tx.knowledgePoint.updateMany({
        where: {
          topicId,
          subtopicId: sourceSubtopicId,
        },
        data: {
          topicId,
          subtopicId: targetSubtopicId,
        },
      });

      //parsedblock and knowledgepoint subtopic update - commented out for now

      // await tx.parsedBlock.updateMany({
      //   where: {
      //     lessonId,
      //     topicId,
      //     subtopicId: sourceSubtopicId,
      //   },
      //   data: {
      //     subtopicId: targetSubtopicId,
      //   },
      // });

      // await tx.knowledgePoint.updateMany({
      //   where: {
      //     category: lessonId,
      //     subcategory: sourceSubtopicId,
      //   },
      //   data: {
      //     subcategory: targetSubtopicId,
      //   },
      // });

      await tx.subtopic.delete({
        where: { id: sourceSubtopicId },
      });
    });

    return {
      lessonId,
      topicId,
      sourceSubtopicId,
      targetSubtopicId,
    };
  }

  /**
   * Get comprehensive details for a specific subtopic
   */
  async getSubtopicDetails(subtopicId: string): Promise<{
    subtopic: any;
    topic: any;
    lesson: any;
    knowledgePoints: any[];
    examQuestions: any[];
    flashcards: {
      approved: any[];
      pending: any[];
    };
    generatedQuestions: {
      approved: any[];
      pending: any[];
    };
    prerequisites: Array<{
      name: string;
      frequency: number;
      strength: string;
      source: string;
    }>;
    stats: {
      totalKnowledgePoints: number;
      totalExamQuestions: number;
      totalFlashcards: number;
      totalGeneratedQuestions: number;
      approvedFlashcards: number;
      approvedGeneratedQuestions: number;
    };
  }> {
    // Get subtopic from registry
    const subtopicRecord = await this.prisma.subtopic.findUnique({
      where: {
        id: subtopicId,
      },
    });

    if (!subtopicRecord) {
      throw new BadRequestException(`Subtopic not found: ${subtopicId}`);
    }

    // Get knowledge points (using subcategory field - legacy)
    const knowledgePoints = await this.prisma.knowledgePoint.findMany({
      where: {
        subtopicId: subtopicId,
      },
      include: {
        approvedContent: {
          include: {
            block: {
              include: {
                page: {
                  include: {
                    batch: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        priority: 'desc',
      },
    });

    // Get exam questions
    const examQuestions = await this.prisma.examQuestion.findMany({
      where: {
        subtopicId: subtopicId,
      },
      include: {
        knowledgePoints: {
          include: {
            knowledgePoint: true,
          },
        },
      },
      orderBy: {
        year: 'desc',
      },
    });

    // Get flashcards
    const allFlashcards = await this.prisma.flashcard.findMany({
      where: {
        knowledgePoint: {
          subtopicId: subtopicId,
        },
      },
      include: {
        knowledgePoint: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const approvedFlashcards = allFlashcards.filter(
      (f) => f.approvalStatus === 'APPROVED',
    );
    const pendingFlashcards = allFlashcards.filter(
      (f) => f.approvalStatus === 'PENDING',
    );

    // Get generated questions
    const allGeneratedQuestions = await this.prisma.questionCard.findMany({
      where: {
        questionKnowledgePoints: {
          some: {
            knowledgePoint: {
              subtopicId: subtopicId,
            },
          },
        },
      },
      include: {
        questionKnowledgePoints: {
          include: {
            knowledgePoint: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const approvedQuestions = allGeneratedQuestions.filter(
      (q) => q.approvalStatus === 'APPROVED',
    );
    const pendingQuestions = allGeneratedQuestions.filter(
      (q) => q.approvalStatus === 'PENDING',
    );

    // Get prerequisites if anatomy
    let prerequisites: Array<{
      name: string;
      frequency: number;
      strength: string;
      source: string;
    }> = [];

    this.logger.log(`Fetching prerequisites for Anatomi topic: `);
    const topicNode = await this.prisma.topic.findUnique({
      where: {
        id: subtopicRecord.topicId,
      },
      include: {
        prerequisiteEdges: {
          include: {
            prerequisite: true,
          },
          orderBy: {
            frequency: 'desc',
          },
        },
      },
    });

    if (!topicNode?.lessonId) {
      throw new BadRequestException(
        `Topic not found for subtopic: ${subtopicId}`,
      );
    }

    const lessonNode = await this.prisma.lesson.findUnique({
      where: {
        id: topicNode?.lessonId,
      },
    });

    if (topicNode) {
      this.logger.log(
        `Found ${topicNode.prerequisiteEdges.length} prerequisite edges for topic: ${subtopicRecord.topicId}`,
      );
      prerequisites = topicNode.prerequisiteEdges.map((edge) => ({
        name: edge.prerequisite.name,
        frequency: edge.frequency,
        strength: edge.strength,
        source: edge.source,
      }));
    } else {
      this.logger.warn(
        `Topic node not found in registry:  ${subtopicRecord.topicId})`,
      );
    }

    return {
      subtopic: subtopicRecord,
      topic: topicNode?.displayName,
      lesson: lessonNode?.displayName,
      knowledgePoints,
      examQuestions,
      flashcards: {
        approved: approvedFlashcards,
        pending: pendingFlashcards,
      },
      generatedQuestions: {
        approved: approvedQuestions,
        pending: pendingQuestions,
      },
      prerequisites,
      stats: {
        totalKnowledgePoints: knowledgePoints.length,
        totalExamQuestions: examQuestions.length,
        totalFlashcards: allFlashcards.length,
        totalGeneratedQuestions: allGeneratedQuestions.length,
        approvedFlashcards: approvedFlashcards.length,
        approvedGeneratedQuestions: approvedQuestions.length,
      },
    };
  }

  /**
   * Create manual content (bypasses Vision/OCR)
   * Creates batch, page, and parsed block directly
   */
  async createManualContent(
    topicId: string,
    description: string | undefined,
    contentType: any,
    textContent: string,
    createdBy: string,
  ): Promise<{ batchId: string; pageId: string; blockId: string }> {
    this.logger.log(`Creating manual content batch for topic ID: ${topicId}`);

    try {
      // Validate topic exists
      const topic = await this.prisma.topic.findUnique({
        where: { id: topicId },
        select: { id: true, name: true, lessonId: true },
      });

      if (!topic) {
        throw new NotFoundException(`Topic not found: ${topicId}`);
      }

      // 1. Create UploadBatch
      const batch = await this.prisma.uploadBatch.create({
        data: {
          topic: topic.name, // Store name for backward compatibility
          description,
          contentTypeHint: contentType,
          status: 'UPLOADED', // Manual content is already uploaded (no OCR needed)
          createdBy,
        },
      });

      this.logger.log(`Batch created: ${batch.id}`);

      // 2. Create UploadPage (required for ParsedBlock relation)
      // For manual content, we don't have a file, so we use a placeholder
      const page = await this.prisma.uploadPage.create({
        data: {
          batchId: batch.id,
          pageNumber: 1,
          fileType: 'IMAGE', // Placeholder
          filePath: 'manual-text', // Placeholder
          originalName: 'manual-text-input.txt',
          ocrStatus: 'COMPLETED', // No OCR needed
        },
      });

      this.logger.log(`Page created: ${page.id}`);

      if (topic.lessonId === null) {
        throw new ConflictException(
          `Topic ${topicId} is not linked to any lesson`,
        );
      }

      // 3. Create ParsedBlock directly (no Vision queue)
      const block = await this.prisma.parsedBlock.create({
        data: {
          pageId: page.id,
          contentType, // From admin input
          rawText: textContent,
          blockType: 'TEXT',
          confidence: 1.0, // Manual entry = 100% confidence
          classificationStatus: 'CLASSIFIED',
          approvalStatus: 'PENDING',
          questions: [],
          importantFacts: [],
          lessonId: topic.lessonId,
        },
      });

      this.logger.log(`ParsedBlock created: ${block.id}`);

      // 4. Update batch status to REVIEWED (ready for admin review, but blocks are already created)
      // Since block is created with PENDING approval, batch should be in REVIEWED state
      await this.prisma.uploadBatch.update({
        where: { id: batch.id },
        data: { status: 'REVIEWED' },
      });

      return {
        batchId: batch.id,
        pageId: page.id,
        blockId: block.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create manual content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Trigger knowledge extraction for a single ApprovedContent
   * @param approvedContentId - The ApprovedContent ID
   */
  async extractKnowledgeForContent(
    approvedContentId: string,
    adminUserId?: string,
  ): Promise<{ queued: boolean; jobId?: string }> {
    this.logger.log(
      `Triggering knowledge extraction for approvedContent: ${approvedContentId}`,
    );

    // Find ApprovedContent
    const approvedContent = await this.prisma.approvedContent.findUnique({
      where: { id: approvedContentId },
    });

    if (!approvedContent) {
      throw new NotFoundException(
        `ApprovedContent ${approvedContentId} not found`,
      );
    }

    // Duplicate protection: Only allow extraction if status allows it
    if (
      !StateMachineValidator.canTriggerExtraction(
        approvedContent.extractionStatus,
      )
    ) {
      this.logger.warn(
        `Duplicate extraction attempt blocked for approvedContent: ${approvedContentId}, status: ${approvedContent.extractionStatus}`,
      );
      throw new BadRequestException(
        `Cannot trigger extraction for ApprovedContent ${approvedContentId}. Current status: ${approvedContent.extractionStatus}. Reset to NOT_STARTED for reprocessing.`,
      );
    }

    // Validate state transition
    StateMachineValidator.validateExtractionTransition(
      approvedContent.extractionStatus,
      'QUEUED',
    );

    try {
      // Update status to QUEUED
      await this.prisma.approvedContent.update({
        where: { id: approvedContentId },
        data: { extractionStatus: 'QUEUED' },
      });

      // Enqueue knowledge extraction job
      const job = await this.knowledgeExtractionQueue.add(
        'extract-knowledge',
        {
          approvedContentId: approvedContent.id,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          jobId: `extract-${approvedContent.id}`,
        },
      );

      this.logger.log(
        `Knowledge extraction job queued for approvedContent: ${approvedContent.id}, job: ${job.id}`,
      );

      // Audit log
      if (adminUserId) {
        await this.auditLogService.logAction({
          adminUserId,
          actionType: 'KNOWLEDGE_EXTRACTION',
          approvedContentId: approvedContent.id,
          batchId: approvedContent.batchId,
          success: true,
          metadata: { jobId: job.id },
        });
      }

      return { queued: true, jobId: job.id };
    } catch (error) {
      // Revert status on error
      await this.prisma.approvedContent.update({
        where: { id: approvedContentId },
        data: { extractionStatus: approvedContent.extractionStatus },
      });

      this.logger.error(
        `Failed to queue knowledge extraction for approvedContent ${approvedContentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // Audit log failure
      if (adminUserId) {
        await this.auditLogService.logAction({
          adminUserId,
          actionType: 'KNOWLEDGE_EXTRACTION',
          approvedContentId,
          success: false,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        });
      }

      throw error;
    }
  }

  /**
   * Trigger knowledge extraction for all ApprovedContent in a batch
   * @param batchId - The batch ID
   */
  async extractKnowledgeForBatch(
    batchId: string,
    adminUserId?: string,
  ): Promise<{ queued: number; skipped: number }> {
    this.logger.log(`Triggering knowledge extraction for batch: ${batchId}`);

    // Verify batch exists
    const batch = await this.prisma.uploadBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    // Find all ApprovedContent that can be extracted (NOT_STARTED or VERIFIED for reprocessing)
    const allApprovedContents = await this.prisma.approvedContent.findMany({
      where: { batchId },
    });

    const approvedContents = allApprovedContents.filter((ac) =>
      StateMachineValidator.canTriggerExtraction(ac.extractionStatus),
    );

    if (approvedContents.length === 0) {
      this.logger.log(
        `No ApprovedContent found for batch ${batchId} eligible for extraction (already processed or invalid status)`,
      );

      // Audit log
      if (adminUserId) {
        await this.auditLogService.logAction({
          adminUserId,
          actionType: 'KNOWLEDGE_EXTRACTION',
          batchId,
          success: true,
          resultCount: 0,
          skippedCount: allApprovedContents.length,
        });
      }

      return { queued: 0, skipped: allApprovedContents.length };
    }

    let queued = 0;
    let skipped = 0;

    for (const approvedContent of approvedContents) {
      try {
        // Update status to QUEUED
        await this.prisma.approvedContent.update({
          where: { id: approvedContent.id },
          data: { extractionStatus: 'QUEUED' },
        });

        // Enqueue knowledge extraction job
        await this.knowledgeExtractionQueue.add(
          'extract-knowledge',
          {
            approvedContentId: approvedContent.id,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            jobId: `extract-${approvedContent.id}`,
          },
        );

        queued++;
        this.logger.debug(
          `Queued knowledge extraction for approvedContent: ${approvedContent.id}`,
        );
      } catch (error) {
        // Revert status on error
        await this.prisma.approvedContent.update({
          where: { id: approvedContent.id },
          data: { extractionStatus: approvedContent.extractionStatus },
        });

        skipped++;
        this.logger.error(
          `Failed to queue knowledge extraction for approvedContent ${approvedContent.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    this.logger.log(
      `Knowledge extraction queued for batch ${batchId}: ${queued} queued, ${skipped} skipped`,
    );

    // Audit log
    if (adminUserId) {
      await this.auditLogService.logAction({
        adminUserId,
        actionType: 'KNOWLEDGE_EXTRACTION',
        batchId,
        success: true,
        resultCount: queued,
        skippedCount: skipped,
      });
    }

    return { queued, skipped };
  }

  /**
   * Get knowledge points for a batch
   * @param batchId - The batch ID
   */
  async getKnowledgePointsForBatch(batchId: string) {
    this.logger.log(`Getting knowledge points for batch: ${batchId}`);

    // Verify batch exists
    const batch = await this.prisma.uploadBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    // Get all knowledge points from approved content in this batch
    const knowledgePoints = await this.prisma.knowledgePoint.findMany({
      where: {
        approvedContent: {
          batchId,
        },
      },
      include: {
        approvedContent: {
          include: {
            block: {
              include: {
                page: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(
      `Retrieved ${knowledgePoints.length} knowledge points for batch: ${batchId}`,
    );

    return knowledgePoints;
  }

  /**
   * Get knowledge points for an approved content
   * @param approvedContentId - The approved content ID
   */
  async getKnowledgePointsForContent(approvedContentId: string) {
    this.logger.log(
      `Getting knowledge points for approvedContent: ${approvedContentId}`,
    );

    // Verify approved content exists
    const approvedContent = await this.prisma.approvedContent.findUnique({
      where: { id: approvedContentId },
    });

    if (!approvedContent) {
      throw new NotFoundException(
        `ApprovedContent ${approvedContentId} not found`,
      );
    }

    // Get all knowledge points for this approved content
    const knowledgePoints = await this.prisma.knowledgePoint.findMany({
      where: {
        approvedContentId,
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(
      `Retrieved ${knowledgePoints.length} knowledge points for approvedContent: ${approvedContentId}`,
    );

    return knowledgePoints;
  }

  /**
   * Get all knowledge points with pagination and filters
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 50)
   * @param sortBy - Sort field (default: 'createdAt')
   * @param sortOrder - Sort order (default: 'desc')
   * @param filterByLesson - Filter by lesson name
   * @param filterByApprovalStatus - Filter by approval status
   * @param searchQuery - Search in fact text
   */
  async getAllKnowledgePoints(
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    filterByLesson?: string,
    filterByApprovalStatus?: string,
    searchQuery?: string,
    hasFlashcard?: boolean,
  ) {
    this.logger.log(
      `Getting all knowledge points - Page: ${page}, Limit: ${limit}`,
    );

    const whereClause: any = {};

    if (filterByLesson) {
      whereClause.lesson = { name: filterByLesson };
    }

    if (filterByApprovalStatus) {
      whereClause.approvalStatus = filterByApprovalStatus;
    }

    if (searchQuery) {
      whereClause.fact = {
        contains: searchQuery,
        mode: 'insensitive',
      };
    }
    if (hasFlashcard !== undefined) {
      if (hasFlashcard) {
        const flashcardKpIds = await this.prisma.flashcard
          .findMany({
            where: {
              knowledgePoint: {
                isNot: null,
              },
            },
            select: {
              knowledgePointId: true,
            },
          })
          .then((flashcards) => flashcards.map((f) => f.knowledgePointId));

        whereClause.id = {
          in: flashcardKpIds,
        };
      } else {
        const flashcardKpIds = await this.prisma.flashcard
          .findMany({
            where: {
              knowledgePoint: {
                isNot: null,
              },
            },
            select: {
              knowledgePointId: true,
            },
          })
          .then((flashcards) => flashcards.map((f) => f.knowledgePointId));

        whereClause.id = {
          notIn: flashcardKpIds,
        };
      }
    }

    // Count total items
    const total = await this.prisma.knowledgePoint.count({
      where: whereClause,
    });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Determine sort field
    const orderByClause: any = {};
    if (sortBy === 'confidence') {
      orderByClause.classificationConfidence = sortOrder;
    } else {
      orderByClause[sortBy] = sortOrder;
    }

    const knowledgePoints = await this.prisma.knowledgePoint.findMany({
      where: whereClause,
      include: {
        topic: true,
        subtopic: true,
        lesson: true,
        approvedContent: {
          include: {
            block: { include: { lesson: true, topic: true } },
          },
        },
      },
      orderBy: orderByClause,
      skip,
      take: limit,
    });

    this.logger.log(
      `Retrieved ${knowledgePoints.length} knowledge points (total: ${total})`,
    );

    return {
      data: knowledgePoints,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get knowledge points for review with similarity matches
   * @param batchId - Optional batch ID to filter by
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 50)
   * @param sortBy - Sort field (default: 'createdAt')
   * @param sortOrder - Sort order (default: 'desc')
   * @param filterByLesson - Filter by lesson name
   * @param filterByPattern - Filter by exam pattern
   * @param minSimilarity - Minimum similarity threshold
   * @returns Knowledge points with similarity matches and pagination metadata
   */
  async getKnowledgePointsForReview(
    batchId?: string,
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    filterByLesson?: string,
    filterByPattern?: string,
    minSimilarity?: number,
    hasFlashcard?: boolean,
  ) {
    this.logger.log(
      `Getting knowledge points for review${batchId ? ` (batch: ${batchId})` : ''} - Page: ${page}, Limit: ${limit}`,
    );

    const whereClause: any = {};

    // Only show PENDING knowledge points for review
    whereClause.approvalStatus = 'PENDING';

    if (batchId) {
      whereClause.approvedContent = { batchId };
    }
    if (filterByLesson) {
      whereClause.lesson = { name: filterByLesson };
    }
    if (filterByPattern) {
      whereClause.examPattern = filterByPattern;
    }
    if (hasFlashcard !== undefined) {
      if (hasFlashcard) {
        const flashcardKpIds = await this.prisma.flashcard
          .findMany({
            where: {
              knowledgePoint: {
                isNot: null,
              },
            },
            select: {
              knowledgePointId: true,
            },
          })
          .then((flashcards) => flashcards.map((f) => f.knowledgePointId));

        whereClause.id = {
          in: flashcardKpIds,
        };
      } else {
        const flashcardKpIds = await this.prisma.flashcard
          .findMany({
            where: {
              knowledgePoint: {
                isNot: null,
              },
            },
            select: {
              knowledgePointId: true,
            },
          })
          .then((flashcards) => flashcards.map((f) => f.knowledgePointId));

        whereClause.id = {
          notIn: flashcardKpIds,
        };
      }
    }

    // Count total items
    const total = await this.prisma.knowledgePoint.count({
      where: whereClause,
    });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Determine sort field
    const orderByClause: any = {};
    if (sortBy === 'similarity') {
      orderByClause.sourceCount = sortOrder;
    } else if (sortBy === 'confidence') {
      orderByClause.classificationConfidence = sortOrder;
    } else {
      orderByClause[sortBy] = sortOrder;
    }

    const knowledgePoints = await this.prisma.knowledgePoint.findMany({
      where: whereClause,
      include: {
        topic: true,
        subtopic: true,
        lesson: true,
        approvedContent: {
          include: {
            block: { include: { lesson: true, topic: true } },
          },
        },
      },
      orderBy: orderByClause,
      skip,
      take: limit,
    });

    // For each knowledge point, find similar ones
    const knowledgePointsWithSimilarity = await Promise.all(
      knowledgePoints.map(async (kp) => {
        // Find similar knowledge points by normalizedKey similarity or fact similarity
        // Using normalizedKey for exact matches and fact text for fuzzy matches
        const similarKPs = await this.prisma.knowledgePoint.findMany({
          where: {
            id: { not: kp.id },
            OR: [
              { normalizedKey: kp.normalizedKey }, // Exact match
              {
                fact: {
                  contains: kp.fact.substring(0, 50), // Partial match
                },
              },
            ],
          },
          include: {
            topic: true,
            subtopic: true,
            approvedContent: {
              include: {
                block: { include: { lesson: true, topic: true } },
              },
            },
          },
          take: 5, // Limit for performance
        });

        const similarityMatches = similarKPs
          .map((similar) => {
            // Simple similarity: count common words
            const words1 = kp.fact.toLowerCase().split(/\s+/);
            const words2 = similar.fact.toLowerCase().split(/\s+/);
            const commonWords = words1.filter((w) => words2.includes(w));
            const similarityScore =
              commonWords.length / Math.max(words1.length, words2.length);

            return {
              knowledgePointId: similar.id,
              fact: similar.fact,
              similarityScore: Math.min(similarityScore, 0.99), // Cap at 0.99
              category: similar.topic?.name || null,
              subcategory: similar.subtopic?.name || null,
            };
          })
          .filter(
            (match) => !minSimilarity || match.similarityScore >= minSimilarity,
          );

        // Sort by similarity score descending
        similarityMatches.sort((a, b) => b.similarityScore - a.similarityScore);

        return {
          id: kp.id,
          fact: kp.fact,
          category: kp.topic?.name || null,
          subcategory: kp.subtopic?.name || null,
          classificationConfidence: kp.classificationConfidence,
          sourceCount: kp.sourceCount,
          examPattern: kp.examPattern, // Pattern type from exam analysis
          approvedContent: {
            id: kp.approvedContent?.id,
            content: kp.approvedContent?.content?.substring(0, 500) || '',
            block: {
              lesson:
                kp.approvedContent?.block?.lesson?.name ||
                kp.lesson?.name ||
                null,
              topic:
                kp.approvedContent?.block?.topic?.name ||
                kp.topic?.name ||
                null,
            },
          },
          similarityMatches: similarityMatches.slice(0, 3), // Top 3 matches
        };
      }),
    );

    this.logger.log(
      `Retrieved ${knowledgePointsWithSimilarity.length} knowledge points for review (Page ${page}/${totalPages})`,
    );

    return {
      data: knowledgePointsWithSimilarity,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Approve a knowledge point
   * @param knowledgePointId - The knowledge point ID
   */
  async approveKnowledgePoint(knowledgePointId: string) {
    this.logger.log(`Approving knowledge point: ${knowledgePointId}`);

    const kp = await this.prisma.knowledgePoint.findUnique({
      where: { id: knowledgePointId },
    });

    if (!kp) {
      throw new NotFoundException(
        `KnowledgePoint ${knowledgePointId} not found`,
      );
    }

    // Update approval status to APPROVED
    const updatedKp = await this.prisma.knowledgePoint.update({
      where: { id: knowledgePointId },
      data: {
        approvalStatus: 'APPROVED',
      },
    });

    return updatedKp;
  }

  /**
   * Merge two knowledge points
   * @param sourceId - The knowledge point to merge (will be deleted)
   * @param targetId - The target knowledge point (will be kept and updated)
   */
  async mergeKnowledgePoints(sourceId: string, targetId: string) {
    this.logger.log(`Merging knowledge point ${sourceId} into ${targetId}`);

    const source = await this.prisma.knowledgePoint.findUnique({
      where: { id: sourceId },
      include: {
        flashcards: true,
        questionKnowledgePoints: true,
      },
    });

    const target = await this.prisma.knowledgePoint.findUnique({
      where: { id: targetId },
    });

    if (!source || !target) {
      throw new NotFoundException('One or both knowledge points not found');
    }

    // Update target with source's data if needed
    const updatedTarget = await this.prisma.knowledgePoint.update({
      where: { id: targetId },
      data: {
        sourceCount: {
          increment: source.sourceCount,
        },
        // Update fact if source is more recent
        fact: source.createdAt > target.createdAt ? source.fact : target.fact,
        // Ensure target is approved
        approvalStatus: 'APPROVED',
      },
    });

    // Move flashcards from source to target
    if (source.flashcards.length > 0) {
      await this.prisma.flashcard.updateMany({
        where: { knowledgePointId: sourceId },
        data: { knowledgePointId: targetId },
      });
    }

    // Move question knowledge points from source to target
    if (source.questionKnowledgePoints.length > 0) {
      await this.prisma.questionKnowledgePoint.updateMany({
        where: { knowledgePointId: sourceId },
        data: { knowledgePointId: targetId },
      });
    }

    // Mark source as MERGED (soft delete)
    await this.prisma.knowledgePoint.update({
      where: { id: sourceId },
      data: {
        approvalStatus: 'MERGED',
      },
    });

    this.logger.log(`Successfully merged ${sourceId} into ${targetId}`);

    return updatedTarget;
  }

  /**
   * Reject a knowledge point
   * @param knowledgePointId - The knowledge point ID
   * @param reason - Rejection reason
   */
  async rejectKnowledgePoint(knowledgePointId: string, reason: string) {
    this.logger.log(
      `Rejecting knowledge point: ${knowledgePointId}, reason: ${reason}`,
    );

    const kp = await this.prisma.knowledgePoint.findUnique({
      where: { id: knowledgePointId },
    });

    if (!kp) {
      throw new NotFoundException(
        `KnowledgePoint ${knowledgePointId} not found`,
      );
    }

    // Update status to REJECTED with reason (soft delete)
    const updatedKp = await this.prisma.knowledgePoint.update({
      where: { id: knowledgePointId },
      data: {
        approvalStatus: 'REJECTED',
        rejectionReason: reason,
      },
    });

    this.logger.log(`Knowledge point ${knowledgePointId} rejected: ${reason}`);

    return updatedKp;
  }

  /**
   * Get flashcards for a batch
   * @param batchId - The batch ID
   */
  async getFlashcardsForBatch(batchId: string) {
    this.logger.log(`Getting flashcards for batch: ${batchId}`);

    const batch = await this.prisma.uploadBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    const flashcards = await this.prisma.flashcard.findMany({
      where: {
        knowledgePoint: {
          approvedContent: {
            batchId,
          },
        },
      },
      include: {
        knowledgePoint: {
          include: {
            approvedContent: {
              include: {
                block: {
                  include: {
                    page: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(
      `Retrieved ${flashcards.length} flashcards for batch: ${batchId}`,
    );
    return flashcards;
  }

  /**
   * Get flashcards for a topic (subcategory)
   * @param topicId - The topic/subcategory ID
   */
  async getFlashcardsForTopic(topicId: string) {
    this.logger.log(`Getting flashcards for topic: ${topicId}`);

    const flashcards = await this.prisma.flashcard.findMany({
      where: {
        knowledgePoint: {
          topic: {
            id: topicId,
          },
        },
      },
      include: {
        knowledgePoint: {
          include: {
            approvedContent: {
              include: {
                block: {
                  include: {
                    page: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(
      `Retrieved ${flashcards.length} flashcards for topic: ${topicId}`,
    );
    return flashcards;
  }

  /**
   * Get questions for a batch
   * @param batchId - The batch ID
   */
  async getQuestionsForBatch(batchId: string) {
    this.logger.log(`Getting questions for batch: ${batchId}`);

    const batch = await this.prisma.uploadBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    const questions = await this.prisma.questionCard.findMany({
      where: {
        questionKnowledgePoints: {
          some: {
            knowledgePoint: {
              approvedContent: {
                batchId,
              },
            },
          },
        },
      },
      include: {
        questionKnowledgePoints: {
          include: {
            knowledgePoint: {
              include: {
                approvedContent: {
                  include: {
                    block: {
                      include: {
                        page: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(
      `Retrieved ${questions.length} questions for batch: ${batchId}`,
    );
    return questions;
  }

  /**
   * Get questions for a topic (subcategory)
   * @param topicId - The topic/subcategory ID
   */
  async getQuestionsForTopic(topicId: string) {
    this.logger.log(`Getting questions for topic: ${topicId}`);

    const questions = await this.prisma.questionCard.findMany({
      where: {
        questionKnowledgePoints: {
          some: {
            knowledgePoint: {
              topic: {
                id: topicId,
              },
            },
          },
        },
      },
      include: {
        questionKnowledgePoints: {
          include: {
            knowledgePoint: {
              include: {
                approvedContent: {
                  include: {
                    block: {
                      include: {
                        page: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(
      `Retrieved ${questions.length} questions for topic: ${topicId}`,
    );
    return questions;
  }

  // ============================================
  // FLASHCARD VISUAL METHODS
  // ============================================

  /**
   * Get flashcards with visual filters
   */
  async getFlashcardsWithVisual(query: FlashcardListQueryDto) {
    this.logger.log(
      `Getting flashcards with visual filters: ${JSON.stringify(query)}`,
    );

    const where: any = {};

    if (query.visualStatus) {
      where.visualStatus = query.visualStatus;
    }

    if (query.useVisual !== undefined) {
      where.useVisual = query.useVisual;
    }

    if (query.visualRequirement) {
      where.visualRequirement = query.visualRequirement;
    }

    if (query.visualContext) {
      where.visualContext = query.visualContext;
    }

    if (query.lesson || query.lessonId) {
      where.lessonId = query.lesson || query.lessonId;
    }

    if (query.topic || query.topicId) {
      where.topicId = query.topic || query.topicId;
    }

    if (query.approvalStatus) {
      where.approvalStatus = query.approvalStatus;
    }

    if (query.cardType) {
      where.cardType = query.cardType;
    }

    if (query.search) {
      where.OR = [
        { front: { contains: query.search, mode: 'insensitive' } },
        { back: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Determine sort order
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const flashcards = await this.prisma.flashcard.findMany({
      where,
      include: {
        knowledgePoint: {
          select: {
            id: true,
            fact: true,
            topic: true,
            subtopic: true,
          },
        },
        lesson: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        topic: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
      orderBy,
    });

    this.logger.log(
      `Retrieved ${flashcards.length} flashcards with visual filters`,
    );
    return flashcards;
  }

  /**
   * Get flashcard detail
   */
  async getFlashcardDetail(id: string) {
    this.logger.log(`Getting flashcard detail: ${id}`);

    const flashcard = await this.prisma.flashcard.findUnique({
      where: { id },
      include: {
        knowledgePoint: {
          include: {
            approvedContent: {
              include: {
                block: {
                  include: {
                    page: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!flashcard) {
      throw new NotFoundException(`Flashcard ${id} not found`);
    }

    return flashcard;
  }

  /**
   * Upload visual asset for flashcard
   */
  async uploadFlashcardVisual(id: string, file: Express.Multer.File) {
    this.logger.log(`Uploading visual for flashcard: ${id}`);

    // Verify flashcard exists
    const flashcard = await this.prisma.flashcard.findUnique({
      where: { id },
    });

    if (!flashcard) {
      throw new NotFoundException(`Flashcard ${id} not found`);
    }

    // Save visual asset
    const asset = await this.visualAssetService.saveVisualAsset(file);

    // Create ImageAsset record in database
    await this.prisma.imageAsset.create({
      data: {
        id: asset.id,
        fileName: asset.originalName,
        filePath: asset.filePath,
        mimeType: asset.mimeType,
        fileSize: file.size,
      },
    });

    // Update flashcard with imageAssetId
    await this.prisma.flashcard.update({
      where: { id },
      data: {
        imageAssetId: asset.id,
      },
    });

    this.logger.log(`Visual uploaded for flashcard ${id}: asset ${asset.id}`);

    return {
      imageAssetId: asset.id,
      parsedRegions: asset.parsedRegions,
    };
  }

  /**
   * Bind visual to flashcard (set highlight region and update status)
   */
  async bindFlashcardVisual(id: string, body: BindVisualDto) {
    this.logger.log(`Binding visual for flashcard: ${id}`);

    const flashcard = await this.prisma.flashcard.findUnique({
      where: { id },
    });

    if (!flashcard) {
      throw new NotFoundException(`Flashcard ${id} not found`);
    }

    // Update flashcard
    const updated = await this.prisma.flashcard.update({
      where: { id },
      data: {
        imageAssetId: body.imageAssetId,
        highlightRegion: body.highlightRegion || null,
        // If visual is required, set status to UPLOADED
        visualStatus:
          flashcard.useVisual &&
          flashcard.visualStatus === VisualStatus.REQUIRED
            ? VisualStatus.UPLOADED
            : flashcard.visualStatus,
      },
    });

    this.logger.log(`Visual bound for flashcard ${id}`);
    return updated;
  }

  /**
   * Get all available image assets (for binding)
   */
  async getImageAssets(search?: string, limit = 50) {
    this.logger.log(`Getting image assets. Search: ${search || 'none'}`);

    const where = search
      ? {
          OR: [
            { fileName: { contains: search, mode: 'insensitive' as const } },
            { filePath: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const assets = await this.prisma.imageAsset.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        mimeType: true,
        fileSize: true,
        createdAt: true,
      },
    });

    return assets;
  }

  /**
   * Publish flashcard (with guard for visual requirement)
   */
  async publishFlashcard(id: string) {
    this.logger.log(`Publishing flashcard: ${id}`);

    const flashcard = await this.prisma.flashcard.findUnique({
      where: { id },
    });

    if (!flashcard) {
      throw new NotFoundException(`Flashcard ${id} not found`);
    }

    // Guard: if visual is required but not uploaded, reject
    if (
      flashcard.useVisual &&
      flashcard.visualStatus !== VisualStatus.UPLOADED
    ) {
      throw new ConflictException(
        'Bu flashcard görsel gerektiriyor. Lütfen görsel yükleyin.',
      );
    }

    // Update approval status
    const updated = await this.prisma.flashcard.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        // TODO: Get actual admin user ID from auth
        approvedBy: 'admin-user-id',
      },
    });

    this.logger.log(`Flashcard ${id} published`);
    return updated;
  }

  /**
   * Bulk publish flashcards
   */
  async bulkPublishFlashcards(ids: string[]) {
    this.logger.log(`Bulk publishing ${ids.length} flashcards`);

    const results = {
      successful: [] as string[],
      failed: [] as { id: string; reason: string }[],
    };

    for (const id of ids) {
      try {
        await this.publishFlashcard(id);
        results.successful.push(id);
      } catch (error) {
        results.failed.push({
          id,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.log(
      `Bulk publish completed: ${results.successful.length} successful, ${results.failed.length} failed`,
    );
    return results;
  }

  /**
   * Update flashcard
   */
  async updateFlashcard(
    id: string,
    data: { front?: string; back?: string; cardType?: string },
  ) {
    this.logger.log(`Updating flashcard: ${id}`);

    const flashcard = await this.prisma.flashcard.findUnique({
      where: { id },
    });

    if (!flashcard) {
      throw new NotFoundException(`Flashcard ${id} not found`);
    }

    const updated = await this.prisma.flashcard.update({
      where: { id },
      data: {
        front: data.front !== undefined ? data.front : flashcard.front,
        back: data.back !== undefined ? data.back : flashcard.back,
        cardType:
          data.cardType !== undefined
            ? (data.cardType as any)
            : flashcard.cardType,
      },
      include: {
        knowledgePoint: {
          select: {
            id: true,
            fact: true,
            topic: true,
            subtopic: true,
          },
        },
        lesson: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        topic: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });

    this.logger.log(`Flashcard ${id} updated`);
    return updated;
  }

  /**
   * Delete flashcard
   */
  async deleteFlashcard(id: string) {
    this.logger.log(`Deleting flashcard: ${id}`);

    const flashcard = await this.prisma.flashcard.findUnique({
      where: { id },
    });

    if (!flashcard) {
      throw new NotFoundException(`Flashcard ${id} not found`);
    }

    await this.prisma.flashcard.delete({
      where: { id },
    });

    this.logger.log(`Flashcard ${id} deleted`);
  }

  /**
   * Get visual asset file path
   */
  async getVisualAssetPath(assetId: string): Promise<string | null> {
    return this.visualAssetService.getVisualAssetPath(assetId);
  }

  /**
   * Get missing visuals KPI
   */
  async getMissingVisualsKPI() {
    this.logger.log('Calculating missing visuals KPI');

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get all flashcards with missing visuals
    const flashcards = await this.prisma.flashcard.findMany({
      where: {
        useVisual: true,
        visualStatus: 'REQUIRED',
      },
      select: {
        lesson: true,
        visualRequirement: true,
        updatedAt: true,
      },
    });

    // Calculate total
    const total = flashcards.length;

    // Calculate byLesson
    const byLesson: Record<string, number> = {};
    flashcards.forEach((card) => {
      const lesson = card.lesson?.name || 'Unknown';
      byLesson[lesson] = (byLesson[lesson] || 0) + 1;
    });

    // Calculate byVisualRequirement
    const byVisualRequirement: Record<string, number> = {
      IMAGE_OCCLUSION: 0,
      SCHEMATIC: 0,
    };
    flashcards.forEach((card) => {
      if (card.visualRequirement === 'IMAGE_OCCLUSION') {
        byVisualRequirement.IMAGE_OCCLUSION++;
      } else if (card.visualRequirement === 'SCHEMATIC') {
        byVisualRequirement.SCHEMATIC++;
      }
    });

    // Calculate aging
    let over7Days = 0;
    let over14Days = 0;
    flashcards.forEach((card) => {
      const updatedAt = new Date(card.updatedAt);
      if (updatedAt < fourteenDaysAgo) {
        over14Days++;
      } else if (updatedAt < sevenDaysAgo) {
        over7Days++;
      }
    });

    return {
      total,
      byLesson,
      byVisualRequirement,
      aging: {
        over7Days,
        over14Days,
      },
    };
  }

  // ============================================
  // EXAM QUESTION METHODS
  // ============================================

  async createExamQuestion(dto: CreateExamQuestionDto, uploadedBy: string) {
    return this.examQuestionService.createExamQuestion(dto, uploadedBy);
  }

  async getExamQuestions(query: ExamQuestionListQueryDto) {
    return this.examQuestionService.getExamQuestions(query);
  }

  async getExamQuestionById(id: string) {
    return this.examQuestionService.getExamQuestionById(id);
  }

  async updateExamQuestion(id: string, dto: UpdateExamQuestionDto) {
    return this.examQuestionService.updateExamQuestion(id, dto);
  }

  async triggerAnalysis(id: string, lessonId: string) {
    return this.examQuestionService.triggerAnalysis(id, lessonId);
  }

  async getKnowledgePoints(examQuestionId: string) {
    return this.examQuestionService.getKnowledgePoints(examQuestionId);
  }

  async linkKnowledgePoint(
    examQuestionId: string,
    knowledgePointId: string,
    relationshipType: 'MEASURED' | 'TRAP' | 'CONTEXT',
  ) {
    return this.examQuestionService.linkKnowledgePoint(
      examQuestionId,
      knowledgePointId,
      relationshipType,
    );
  }

  async unlinkKnowledgePoint(
    examQuestionId: string,
    knowledgePointId: string,
    relationshipType: 'MEASURED' | 'TRAP' | 'CONTEXT',
  ) {
    return this.examQuestionService.unlinkKnowledgePoint(
      examQuestionId,
      knowledgePointId,
      relationshipType,
    );
  }

  parseBulkText(text: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return this.examQuestionService.parseBulkText(text);
  }

  async bulkImportQuestions(questions: any[], uploadedBy: string) {
    return await this.examQuestionService.bulkImportQuestions(
      questions,
      uploadedBy,
    );
  }

  async deleteExamQuestion(id: string) {
    return this.examQuestionService.deleteExamQuestion(id);
  }

  async generateKnowledgeFromExamQuestion(examQuestionId: string) {
    return await this.examQuestionService.generateKnowledgeFromExamQuestion(
      examQuestionId,
    );
  }

  async generateQuestionCardFromExamQuestion(examQuestionId: string) {
    return await this.examQuestionService.generateQuestionCardFromExamQuestion(
      examQuestionId,
    );
  }

  async linkConceptToQuestion(examQuestionId: string, conceptId: string) {
    const examQuestion = await this.prisma.examQuestion.findUnique({
      where: { id: examQuestionId },
    });

    if (!examQuestion) {
      throw new NotFoundException(`Exam question ${examQuestionId} not found`);
    }

    const concept = await this.prisma.concept.findUnique({
      where: { id: conceptId },
    });

    if (!concept) {
      throw new NotFoundException(`Concept ${conceptId} not found`);
    }

    const existing = await this.prisma.questionConcept.findUnique({
      where: {
        questionId_conceptId: {
          questionId: examQuestionId,
          conceptId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Concept already linked to this question');
    }

    const link = await this.prisma.questionConcept.create({
      data: {
        questionId: examQuestionId,
        conceptId,
      },
      include: {
        concept: {
          select: {
            id: true,
            preferredLabel: true,
            normalizedLabel: true,
            conceptType: true,
            status: true,
          },
        },
      },
    });

    this.logger.log(
      `Linked concept ${concept.preferredLabel} to exam question ${examQuestionId}`,
    );

    return link;
  }

  async unlinkConceptFromQuestion(examQuestionId: string, conceptId: string) {
    const link = await this.prisma.questionConcept.findUnique({
      where: {
        questionId_conceptId: {
          questionId: examQuestionId,
          conceptId,
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Concept link not found');
    }

    await this.prisma.questionConcept.delete({
      where: {
        questionId_conceptId: {
          questionId: examQuestionId,
          conceptId,
        },
      },
    });

    this.logger.log(
      `Unlinked concept ${conceptId} from exam question ${examQuestionId}`,
    );

    return { success: true };
  }

  async getGeneratedCardsForExamQuestion(examQuestionId: string) {
    return await this.prisma.questionCard.findMany({
      where: {
        sourceExamQuestionId: examQuestionId,
      },
      include: {
        lesson: true,
        topic: true,
        subtopic: true,
        prerequisite: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ============================================
  // ONTOLOGY RESOLUTION
  // ============================================

  async getQuestionsNeedingReview(lessonId?: string) {
    return this.examQuestionService.getQuestionsNeedingReview(lessonId);
  }

  async getUnmatchedOntologySuggestions(filters?: {
    lessonId?: string;
    minOccurrences?: number;
  }) {
    return this.examQuestionService.getUnmatchedOntologySuggestions(filters);
  }

  async resolveOntologyMismatches(
    examQuestionId: string,
    resolution: {
      topicId?: string;
      subtopicId?: string;
      conceptIds?: string[];
      action: 'APPROVE_AS_IS' | 'REJECT_SUGGESTIONS' | 'RESOLVE';
    },
  ) {
    return this.examQuestionService.resolveOntologyMismatches(
      examQuestionId,
      resolution,
    );
  }

  async createOntologyEntity(data: {
    name: string;
    entityType: 'TOPIC' | 'SUBTOPIC' | 'CONCEPT';
    lessonId: string;
    topicId?: string;
    subtopicId?: string;
  }) {
    return this.examQuestionService.createOntologyEntity(data);
  }

  // async checkQuestionSimilarity(
  //   generatedQuestion: {
  //     questionText: string;
  //     spotRule?: string;
  //     topic?: string;
  //     subtopic?: string;
  //     optionAnalysis?: Array<{ wouldBeCorrectIf: string }>;
  //   },
  //   examQuestionId?: string,
  //   lesson?: string,
  // ) {
  //   if (examQuestionId) {
  //     // Check against specific exam question
  //     const examQuestion =
  //       await this.examQuestionService.getExamQuestionById(examQuestionId);

  //     // Parse traps
  //     let optionAnalysis: Array<{ wouldBeCorrectIf: string }> | undefined;
  //     let spotRule: string | undefined;

  //     if (examQuestion.traps) {
  //       const traps = examQuestion.traps as any;
  //       if (typeof traps === 'object' && !Array.isArray(traps)) {
  //         spotRule = traps.spotRule;
  //         optionAnalysis = traps.optionAnalysis;
  //       }
  //     }

  //     return this.examQuestionSimilarityService.checkSimilarity(
  //       generatedQuestion,
  //       {
  //         questionText: examQuestion.question,
  //         spotRule: spotRule,
  //         topic: examQuestion.topic || undefined,
  //         subtopic: examQuestion.subtopic || undefined,
  //         optionAnalysis: optionAnalysis,
  //       },
  //     );
  //   } else {
  //     // Check against all exam questions
  //     return this.examQuestionSimilarityService.checkSimilarityAgainstAll(
  //       generatedQuestion,
  //       lessonId,
  //     );
  //   }
  // }

  // ============================================
  // AI TASK CONFIG METHODS
  // ============================================

  /**
   * Get all AI task configurations
   */
  async getAllAITaskConfigs() {
    const configs = await this.prisma.aITaskConfig.findMany({
      orderBy: { taskType: 'asc' },
    });
    return configs;
  }

  /**
   * Get AI task configuration for a specific task type
   */
  async getAITaskConfig(taskType: AITaskType) {
    const config = await this.prisma.aITaskConfig.findUnique({
      where: { taskType },
    });

    if (!config) {
      throw new NotFoundException(
        `AI config not found for task type: ${taskType}`,
      );
    }

    return config;
  }

  /**
   * Update AI task configuration
   */
  async updateAITaskConfig(taskType: AITaskType, dto: UpdateAITaskConfigDto) {
    // Check if config exists
    const existing = await this.prisma.aITaskConfig.findUnique({
      where: { taskType },
    });

    if (!existing) {
      throw new NotFoundException(
        `AI config not found for task type: ${taskType}`,
      );
    }

    // Determine final provider and model values
    const finalProvider =
      dto.provider !== undefined ? dto.provider : existing.provider;
    let finalModel = dto.model !== undefined ? dto.model : existing.model;

    // Validate provider-model compatibility
    const openaiModels = [
      // GPT-5.2 series
      'gpt-5.2',
      'gpt-5.2-chat-latest',
      'gpt-5.2-codex',
      'gpt-5.2-pro',
      // GPT-5.1 series
      'gpt-5.1',
      'gpt-5.1-instant',
      'gpt-5.1-thinking',
      'gpt-5.1-pro',
      'gpt-5.1-mini',
      'gpt-5.1-nano',
      'gpt-5.1-chat-latest',
      'gpt-5.1-codex-max',
      'gpt-5.1-codex',
      // GPT-5 series
      'gpt-5',
      'gpt-5-chat-latest',
      'gpt-5-codex',
      'gpt-5-pro',
      'gpt-5-mini',
      'gpt-5-nano',
      // GPT-4.1 series
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      // GPT-4o series
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4o-2024-08-06',
      'gpt-4o-2024-11-20',
      'gpt-4o-2024-05-13',
      // Reasoning models (o1 series)
      'o1-preview',
      'o1-mini',
      // GPT-4 Turbo models
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4-0125-preview',
      'gpt-4-1106-preview',
      // GPT-4 base
      'gpt-4',
      // GPT-3.5 models
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-0125',
      'gpt-3.5-turbo-1106',
      // Realtime models
      'gpt-realtime',
      'gpt-realtime-mini',
      'gpt-4o-realtime-preview',
      'gpt-4o-mini-realtime-preview',
      // Embedding models
      'text-embedding-3-small',
      'text-embedding-3-large',
      'text-embedding-ada-002',
    ];
    const geminiModels = [
      // Gemini 3 series (2025) - Latest models
      'gemini-3-flash-preview',
      'gemini-3-pro-preview',
      // Gemini 2.5 series (2025) - Current supported models
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      // Embedding models
      'text-embedding-004',
      // Legacy models (still supported but deprecated)
      'gemini-1.5-flash-002',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-pro',
    ];

    // If provider changed without a model override, set a sane default
    if (dto.provider !== undefined && dto.model === undefined) {
      if (finalProvider === 'OPENAI') {
        finalModel = 'gpt-4o';
      }
      if (finalProvider === 'GEMINI') {
        finalModel = 'gemini-2.5-flash';
      }
    }

    if (finalProvider === 'OPENAI' && !openaiModels.includes(finalModel)) {
      throw new BadRequestException(
        `Model ${finalModel} is not compatible with provider OPENAI. Please select a valid OpenAI model.`,
      );
    }

    if (finalProvider === 'GEMINI' && !geminiModels.includes(finalModel)) {
      throw new BadRequestException(
        `Model ${finalModel} is not compatible with provider GEMINI. Please select a valid Gemini model.`,
      );
    }

    // Update config
    const updateData: any = {};
    if (dto.provider !== undefined) {
      updateData.provider = dto.provider;
      this.logger.log(
        `Updating provider for ${taskType}: ${existing.provider} -> ${dto.provider}`,
      );
    }
    if (
      dto.model !== undefined ||
      (dto.provider !== undefined && dto.model === undefined)
    ) {
      updateData.model = finalModel;
      this.logger.log(
        `Updating model for ${taskType}: ${existing.model} -> ${finalModel}`,
      );
    }
    if (dto.temperature !== undefined) {
      updateData.temperature = dto.temperature;
    }
    if (dto.maxTokens !== undefined) {
      updateData.maxTokens = dto.maxTokens;
    }
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const config = await this.prisma.aITaskConfig.update({
      where: { taskType },
      data: updateData,
    });

    this.logger.log(
      `Updated AI config for task type: ${taskType} - provider: ${config.provider}, model: ${config.model}, isActive: ${config.isActive}`,
    );

    return config;
  }

  // ============================================
  // PREREQUISITE LEARNING METHODS
  // ============================================

  async getPrerequisiteAnalytics() {
    return this.prerequisiteLearningService.getAnalytics();
  }

  async getAllPrerequisites(query: PrerequisiteQueryDto) {
    return this.prerequisiteLearningService.getAllPrerequisites(query);
  }

  async getPrerequisiteDetail(
    id: string,
    query: PrerequisiteDetailQueryDto,
  ): Promise<PrerequisiteDetailResponseDto> {
    return this.prerequisiteLearningService.getPrerequisiteDetail(id, query);
  }

  async getPrerequisiteReviewRecommendation(id: string) {
    return this.prerequisiteLearningService.getReviewRecommendation(id);
  }

  async deprecatePrerequisite(id: string) {
    return this.prerequisiteLearningService.deprecatePrerequisite(id);
  }

  async linkConceptsToPrerequisite(id: string, conceptIds: string[]) {
    return this.prerequisiteLearningService.linkConceptsToPrerequisite(
      id,
      conceptIds,
    );
  }

  async searchConcepts(query: string, limit: number = 20) {
    return this.prisma.concept.findMany({
      where: {
        OR: [
          { preferredLabel: { contains: query, mode: 'insensitive' } },
          { normalizedLabel: { contains: query, mode: 'insensitive' } },
          {
            aliases: {
              some: {
                alias: { contains: query, mode: 'insensitive' },
              },
            },
          },
        ],
        status: 'ACTIVE',
      },
      select: {
        id: true,
        preferredLabel: true,
        conceptType: true,
        status: true,
      },
      take: limit,
      orderBy: {
        preferredLabel: 'asc',
      },
    });
  }

  async getAllTopicsWithPrerequisites() {
    return this.prerequisiteLearningService.getAllTopics();
  }

  async getTopicPrerequisites(topicId: string) {
    return this.prerequisiteLearningService.getTopicPrerequisites(topicId);
  }

  async getPrerequisiteTopics(prerequisiteName: string) {
    return this.prerequisiteLearningService.getPrerequisiteTopics(
      prerequisiteName,
    );
  }

  async processAllAnalyzedQuestions() {
    return this.prerequisiteLearningService.processAllAnalyzedQuestions();
  }

  async processAnalyzedQuestion(examQuestionId: string) {
    await this.prerequisiteLearningService.processAnalyzedQuestion(
      examQuestionId,
    );
    return { examQuestionId };
  }

  async getLearningPathForTopic(topicId: string) {
    return this.prerequisiteLearningService.getLearningPathForTopic(topicId);
  }

  async getPrerequisiteContextForTopic(topicId: string) {
    return this.prerequisiteLearningService.getPrerequisiteContextForTopic(
      topicId,
    );
  }

  async shouldBlockAdvancedContentGeneration(topicId: string) {
    return this.prerequisiteLearningService.shouldBlockAdvancedContentGeneration(
      topicId,
    );
  }

  // ============================================
  // PREREQUISITE MERGE METHODS
  // ============================================

  async previewPrerequisiteMerge(selectedPrerequisiteIds: string[]) {
    return await this.prerequisiteLearningService.previewPrerequisiteMerge(
      selectedPrerequisiteIds,
    );
  }

  async mergePrerequisites(
    selectedPrerequisiteIds: string[],
    canonicalName?: string,
    canonicalPrerequisiteId?: string,
  ) {
    return await this.prerequisiteLearningService.mergePrerequisites(
      selectedPrerequisiteIds,
      canonicalName,
      canonicalPrerequisiteId,
    );
  }

  async mergeLabelOnlyPrerequisite(
    prerequisiteId: string,
    conceptIds: string[],
    adminLabel?: string,
  ) {
    return await this.prerequisiteLearningService.mergeLabelOnlyPrerequisite(
      prerequisiteId,
      conceptIds,
      adminLabel,
    );
  }

  // ============================================
  // LESSON/TOPIC/SUBTOPIC REGISTRY METHODS
  // ============================================

  async getRegistryStats() {
    return await this.examQuestionRegistryService.getRegistryStats();
  }

  async getAllLessons() {
    return await this.examQuestionRegistryService.getAllLessons();
  }

  async getTopicsForLesson(lessonId: string) {
    return await this.examQuestionRegistryService.getTopicsForLesson(
      lessonId || '',
    );
  }

  async getSubtopicsForTopic(topicId: string, lessonId: string) {
    return await this.examQuestionRegistryService.getSubtopicsForTopic(
      topicId,
      lessonId,
    );
  }

  // ============================================
  // BULK UPLOAD METHODS
  // ============================================

  /**
   * Preview bulk question upload - parse and validate without saving
   */
  bulkUploadPreview(text: string, lessonId: string) {
    this.logger.log(`Previewing bulk upload for lesson: ${lessonId}`);

    const parseResult = this.bulkParserService.parseBulkText(text);

    return {
      totalParsed: parseResult.totalParsed,
      validCount: parseResult.validQuestions.length,
      invalidCount: parseResult.invalidQuestions.length,
      validQuestions: parseResult.validQuestions.slice(0, 3), // Preview first 3
      invalidQuestions: parseResult.invalidQuestions,
    };
  }

  /**
   * Save bulk uploaded questions to database with RAW status
   */
  async bulkUploadSave(
    text: string,
    lesson: string,
    year: number,
    examType: string | undefined,
    uploadedBy: string,
  ) {
    this.logger.log(`Saving bulk upload for lesson: ${lesson}, year: ${year}`);

    const parseResult = this.bulkParserService.parseBulkText(text);

    if (parseResult.validQuestions.length === 0) {
      throw new BadRequestException(
        'No valid questions found in the input text',
      );
    }

    // Save all valid questions with RAW status
    const createdQuestions: any[] = [];

    const lessonRecord = await this.prisma.lesson.findUnique({
      where: { name: lesson },
    });

    if (!lessonRecord) {
      throw new NotFoundException(`Lesson not found: ${lesson}`);
    }

    const lessonId = lessonRecord.id;

    for (const parsed of parseResult.validQuestions) {
      const question = await this.prisma.examQuestion.create({
        data: {
          year,
          examType: examType || null,
          questionNumber: parsed.questionNumber || null,
          question: parsed.questionText,
          options: parsed.options,
          correctAnswer: parsed.correctAnswer || 'A', // Default if not provided
          explanation: parsed.explanation || null,
          lessonId,
          traps: [],
          analysisStatus: 'RAW', // Mark as RAW - not analyzed yet
          source: 'BULK_UPLOAD',
          rawText: parsed.rawText,
          uploadedBy,
        },
      });

      createdQuestions.push(question);
    }

    this.logger.log(
      `Saved ${createdQuestions.length} questions with RAW status`,
    );

    return {
      success: true,
      savedCount: createdQuestions.length,
      questions: createdQuestions,
      invalidCount: parseResult.invalidQuestions.length,
      invalidQuestions: parseResult.invalidQuestions,
    };
  }

  /**
   * Trigger analysis/re-analysis for multiple questions
   * Each question will be analyzed individually (NOT batched)
   * Supports re-analysis of already analyzed questions
   */
  async bulkAnalyze(questionIds: string[]) {
    this.logger.log(
      `Triggering bulk analysis for ${questionIds.length} questions`,
    );

    // Verify all questions exist
    const questions = await this.prisma.examQuestion.findMany({
      where: {
        id: { in: questionIds },
      },
      select: {
        id: true,
        lesson: true,
        analysisStatus: true,
      },
    });

    if (questions.length === 0) {
      throw new BadRequestException('No questions found with provided IDs');
    }

    if (questions.length !== questionIds.length) {
      this.logger.warn(
        `Only ${questions.length} of ${questionIds.length} questions exist`,
      );
    }

    let queued = 0;
    let skipped = 0;
    let alreadyProcessing = 0;
    const queuedJobs: string[] = [];

    // Process each question
    for (const question of questions) {
      // Skip if already in processing state
      if (question.analysisStatus === 'PROCESSING') {
        this.logger.warn(
          `Question ${question.id} is already ${question.analysisStatus}, skipping`,
        );
        alreadyProcessing++;
        continue;
      }

      try {
        // Set status to PENDING for re-analysis
        await this.prisma.examQuestion.update({
          where: { id: question.id },
          data: {
            analysisStatus: 'PENDING',
            analyzedAt: null, // Clear previous analysis timestamp
          },
        });

        // Queue for analysis
        const job = await this.examQuestionAnalysisQueue.add(
          'analyze-exam-question',
          {
            examQuestionId: question.id,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
        );

        if (job.id) {
          queuedJobs.push(job.id);
          queued++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to queue question ${question.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        skipped++;
      }
    }

    this.logger.log(
      `Bulk analysis complete: ${queued} queued, ${skipped} skipped, ${alreadyProcessing} already processing`,
    );

    return {
      success: true,
      queued,
      skipped,
      alreadyProcessing,
      queuedCount: queued, // For backward compatibility
      jobIds: queuedJobs,
    };
  }

  async bulkProcess(questionIds: string[]) {
    this.logger.log(`Bulk processing ${questionIds.length} exam questions`);

    const questions = await this.prisma.examQuestion.findMany({
      where: {
        id: { in: questionIds },
      },
      select: {
        id: true,
        analysisStatus: true,
      },
    });

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const question of questions) {
      // Only process ANALYZED questions
      if (question.analysisStatus !== 'ANALYZED') {
        this.logger.warn(
          `Skipping question ${question.id}: status is ${question.analysisStatus}, expected ANALYZED`,
        );
        skipped++;
        continue;
      }

      try {
        await this.prerequisiteLearningService.processAnalyzedQuestion(
          question.id,
        );
        processed++;
      } catch (error) {
        this.logger.error(
          `Failed to process question ${question.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        errors++;
      }
    }

    this.logger.log(
      `Bulk processing complete: ${processed} processed, ${skipped} skipped, ${errors} errors`,
    );

    return {
      success: true,
      processed,
      skipped,
      errors,
    };
  }

  async bulkCreateReplicas(questionIds: string[]) {
    this.logger.log(
      `Bulk creating replicas for ${questionIds.length} exam questions`,
    );

    const questions = await this.prisma.examQuestion.findMany({
      where: {
        id: { in: questionIds },
      },
      select: {
        id: true,
        analysisStatus: true,
      },
    });

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const question of questions) {
      // Only create replicas from ANALYZED questions
      if (question.analysisStatus !== 'ANALYZED') {
        this.logger.warn(
          `Skipping question ${question.id}: status is ${question.analysisStatus}, expected ANALYZED`,
        );
        skipped++;
        continue;
      }

      try {
        await this.examQuestionService.generateQuestionCardFromExamQuestion(
          question.id,
        );
        created++;
      } catch (error) {
        this.logger.error(
          `Failed to create replica for question ${question.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        errors++;
      }
    }

    this.logger.log(
      `Bulk replica creation complete: ${created} created, ${skipped} skipped, ${errors} errors`,
    );

    return {
      success: true,
      created,
      skipped,
      errors,
    };
  }

  // =====================
  // Generated Questions Management
  // =====================

  async listGeneratedQuestions(filters: {
    status?: string;
    lessonId?: string;
    topicId?: string;
    subtopicId?: string;
    prerequisiteId?: string;
    sourceExamQuestionId?: string;
    sourceType?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    this.logger.log(
      `Listing generated questions with filters: ${JSON.stringify(filters)}`,
    );

    const where: any = {};

    if (filters.status) {
      where.approvalStatus = filters.status;
    }

    if (filters.lessonId) {
      where.lessonId = filters.lessonId;
    }

    if (filters.topicId) {
      where.topicId = filters.topicId;
    }

    if (filters.subtopicId) {
      where.subtopicId = filters.subtopicId;
    }

    if (filters.prerequisiteId) {
      where.prerequisiteId = filters.prerequisiteId;
    }

    if (filters.sourceExamQuestionId) {
      where.sourceExamQuestionId = filters.sourceExamQuestionId;
    }

    if (filters.sourceType) {
      where.sourceType = filters.sourceType;
    }

    const take = filters.limit || 100;
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const skip = (page - 1) * take;

    // Dynamic sorting
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    const orderBy: any = {};

    if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'updatedAt') {
      orderBy.updatedAt = sortOrder;
    } else if (sortBy === 'approvalStatus') {
      orderBy.approvalStatus = sortOrder;
    } else if (sortBy === 'sourceType') {
      orderBy.sourceType = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const questions = await this.prisma.questionCard.findMany({
      where,
      include: {
        lesson: {
          select: {
            id: true,
            name: true,
          },
        },
        topic: {
          select: {
            id: true,
            name: true,
            mergedIntoId: true,
          },
        },
        subtopic: {
          select: {
            id: true,
            name: true,
          },
        },
        prerequisite: {
          select: {
            id: true,
            name: true,
          },
        },
        questionKnowledgePoints: {
          include: {
            knowledgePoint: {
              select: {
                id: true,
                fact: true,
              },
            },
          },
        },
        sourceExamQuestion: {
          select: {
            id: true,
            year: true,
            question: true,
            correctAnswer: true,
            patternType: true,
          },
        },
      },
      orderBy,
      take,
      skip,
    });

    const total = await this.prisma.questionCard.count({ where });

    // Count by status
    const statusCounts = await this.prisma.questionCard.groupBy({
      by: ['approvalStatus'],
      _count: true,
    });

    return {
      questions,
      total,
      statusCounts: statusCounts.reduce(
        (acc, item) => {
          acc[item.approvalStatus] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  async getGeneratedQuestion(id: string) {
    this.logger.log(`Getting generated question: ${id}`);

    const question = await this.prisma.questionCard.findUnique({
      where: { id },
      include: {
        lesson: {
          select: {
            id: true,
            name: true,
          },
        },
        topic: {
          select: {
            id: true,
            name: true,
          },
        },
        subtopic: {
          select: {
            id: true,
            name: true,
          },
        },
        prerequisite: {
          select: {
            id: true,
            name: true,
          },
        },
        questionKnowledgePoints: {
          include: {
            knowledgePoint: {
              select: {
                id: true,
                fact: true,
              },
            },
          },
        },
        spatialContexts: {
          include: {
            concept: {
              select: {
                id: true,
                preferredLabel: true,
                normalizedLabel: true,
              },
            },
          },
        },
        sourceExamQuestion: {
          select: {
            id: true,
            year: true,
            examType: true,
            question: true,
            options: true,
            correctAnswer: true,
            patternType: true,
            analysisPayload: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`Generated question ${id} not found`);
    }

    return question;
  }

  async approveGeneratedQuestion(id: string, approvedBy: string) {
    this.logger.log(`Approving generated question: ${id} by ${approvedBy}`);

    const question = await this.prisma.questionCard.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException(`Generated question ${id} not found`);
    }

    if (question.approvalStatus === 'APPROVED') {
      throw new ConflictException('Question is already approved');
    }

    // Update approval status
    const updated = await this.prisma.questionCard.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        approvedBy,
        updatedAt: new Date(),
      },
      include: {
        lesson: true,
        topic: true,
        subtopic: true,
        prerequisite: true,
      },
    });

    // Log the approval action
    await this.auditLogService.logAction({
      entityType: 'GENERATED_QUESTION',
      entityId: id,
      action: 'APPROVE',
      userId: approvedBy,
      details: {
        questionType: question.scenarioType,
        lessonId: question.lessonId,
        topicId: question.topicId,
        prerequisiteId: question.prerequisiteId,
      },
    });

    this.logger.log(`Generated question ${id} approved successfully`);
    return updated;
  }

  async rejectGeneratedQuestion(
    id: string,
    rejectedBy: string,
    reason?: string,
  ) {
    this.logger.log(`Rejecting generated question: ${id} by ${rejectedBy}`);

    const question = await this.prisma.questionCard.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException(`Generated question ${id} not found`);
    }

    if (question.approvalStatus === 'REJECTED') {
      throw new ConflictException('Question is already rejected');
    }

    // Update rejection status - we'll store reason in explanation or a comment field
    const updated = await this.prisma.questionCard.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        updatedAt: new Date(),
      },
      include: {
        lesson: true,
        topic: true,
        subtopic: true,
        prerequisite: true,
      },
    });

    // Log the rejection action
    await this.auditLogService.logAction({
      entityType: 'GENERATED_QUESTION',
      entityId: id,
      action: 'REJECT',
      userId: rejectedBy,
      details: {
        reason,
        questionType: question.scenarioType,
        lessonId: question.lessonId,
      },
    });

    this.logger.log(`Generated question ${id} rejected successfully`);
    return updated;
  }

  async editGeneratedQuestion(
    id: string,
    updates: {
      question?: string;
      options?: Record<string, string>;
      correctAnswer?: string;
      explanation?: string;
      editedBy: string;
    },
  ) {
    this.logger.log(`Editing generated question: ${id} by ${updates.editedBy}`);

    const question = await this.prisma.questionCard.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException(`Generated question ${id} not found`);
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.question !== undefined) {
      updateData.question = updates.question;
    }

    if (updates.options !== undefined) {
      updateData.options = updates.options;
    }

    if (updates.correctAnswer !== undefined) {
      updateData.correctAnswer = updates.correctAnswer;
    }

    if (updates.explanation !== undefined) {
      updateData.explanation = updates.explanation;
    }

    // Update the question
    const updated = await this.prisma.questionCard.update({
      where: { id },
      data: updateData,
      include: {
        lesson: true,
        topic: true,
        subtopic: true,
        prerequisite: true,
      },
    });

    // Log the edit action
    await this.auditLogService.logAction({
      entityType: 'GENERATED_QUESTION',
      entityId: id,
      action: 'EDIT',
      userId: updates.editedBy,
      details: {
        changes: updates,
        questionType: question.scenarioType,
      },
    });

    this.logger.log(`Generated question ${id} edited successfully`);
    return updated;
  }

  async deleteGeneratedQuestion(id: string) {
    this.logger.log(`Deleting generated question: ${id}`);

    const question = await this.prisma.questionCard.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException(`Generated question ${id} not found`);
    }

    // Soft delete by updating status
    await this.prisma.questionCard.update({
      where: { id },
      data: {
        approvalStatus: 'DELETED',
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Generated question ${id} deleted successfully`);
  }

  async bulkDeleteGeneratedQuestions(questionIds: string[]) {
    this.logger.log(`Bulk deleting ${questionIds.length} generated questions`);

    let deleted = 0;
    let notFound = 0;
    let errors = 0;

    for (const id of questionIds) {
      try {
        const question = await this.prisma.questionCard.findUnique({
          where: { id },
        });

        if (!question) {
          this.logger.warn(`Question ${id} not found, skipping`);
          notFound++;
          continue;
        }

        await this.prisma.questionCard.update({
          where: { id },
          data: {
            approvalStatus: 'DELETED',
            updatedAt: new Date(),
          },
        });

        deleted++;
      } catch (error) {
        this.logger.error(
          `Failed to delete question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        errors++;
      }
    }

    this.logger.log(
      `Bulk delete complete: ${deleted} deleted, ${notFound} not found, ${errors} errors`,
    );

    return {
      success: true,
      deleted,
      notFound,
      errors,
    };
  }

  async createConceptFromPrerequisite(data: {
    preferredLabel: string;
    conceptType: string;
    definition?: string;
    aliases?: string[];
    prerequisiteId: string;
  }) {
    this.logger.log(
      `Creating concept from prerequisite: ${data.prerequisiteId}`,
    );

    // Verify prerequisite exists
    const prerequisite = await this.prisma.prerequisite.findUnique({
      where: { id: data.prerequisiteId },
    });

    if (!prerequisite) {
      throw new NotFoundException(
        `Prerequisite ${data.prerequisiteId} not found`,
      );
    }

    // Create concept with transaction
    return this.prisma.$transaction(async (tx) => {
      // Create the concept
      const concept = await tx.concept.create({
        data: {
          preferredLabel: data.preferredLabel,
          normalizedLabel: data.preferredLabel.toLowerCase().trim(),
          conceptType: data.conceptType as any,
          description: data.definition,
          status: 'ACTIVE',
          aliases: data.aliases?.length
            ? {
                create: data.aliases.map((alias) => ({
                  alias,
                  normalizedAlias: alias.toLowerCase().trim(),
                })),
              }
            : undefined,
        },
        include: {
          aliases: true,
        },
      });

      // Link concept to prerequisite
      await tx.prerequisite.update({
        where: { id: data.prerequisiteId },
        data: {
          canonicalKey: `concept:${concept.id}`,
          concepts: {
            create: {
              conceptId: concept.id,
            },
          },
        },
      });

      this.logger.log(
        `Concept ${concept.id} created and linked to prerequisite ${data.prerequisiteId}`,
      );
      return concept;
    });
  }

  async updatePrerequisite(
    id: string,
    data: { name?: string; canonicalKey?: string; notes?: string },
  ) {
    this.logger.log(`Updating prerequisite: ${id}`);

    const prerequisite = await this.prisma.prerequisite.findUnique({
      where: { id },
    });

    if (!prerequisite) {
      throw new NotFoundException(`Prerequisite ${id} not found`);
    }

    const updated = await this.prisma.prerequisite.update({
      where: { id },
      data: {
        name: data.name,
        canonicalKey: data.canonicalKey,
        updatedAt: new Date(),
      },
      include: {
        concepts: {
          include: {
            concept: true,
          },
        },
      },
    });

    // Log audit trail if notes provided
    if (data.notes) {
      await this.auditLogService.logAction({
        entityType: 'PREREQUISITE',
        entityId: id,
        action: 'UPDATE',
        userId: 'admin',
        details: {
          changes: data,
          notes: data.notes,
        },
      });
    }

    this.logger.log(`Prerequisite ${id} updated successfully`);
    return updated;
  }

  async mergePrerequisitePair(sourceId: string, targetId: string) {
    this.logger.log(`Merging prerequisite ${sourceId} into ${targetId}`);

    // Verify both prerequisites exist
    const [source, target] = await Promise.all([
      this.prisma.prerequisite.findUnique({
        where: { id: sourceId },
        include: {
          edges: true,
          concepts: {
            include: {
              concept: true,
            },
          },
        },
      }),
      this.prisma.prerequisite.findUnique({
        where: { id: targetId },
        include: {
          concepts: {
            include: {
              concept: true,
            },
          },
        },
      }),
    ]);

    if (!source) {
      throw new NotFoundException(`Source prerequisite ${sourceId} not found`);
    }

    if (!target) {
      throw new NotFoundException(`Target prerequisite ${targetId} not found`);
    }

    // Perform merge in transaction
    return this.prisma.$transaction(async (tx) => {
      // Transfer all topic edges to target
      await tx.prerequisiteTopicEdge.updateMany({
        where: { prerequisiteId: sourceId },
        data: { prerequisiteId: targetId },
      });

      // Transfer concept links that don't already exist on target
      const targetConceptIds = target.concepts.map((link) => link.conceptId);
      const sourceConceptIds = source.concepts
        .map((link) => link.conceptId)
        .filter((id) => !targetConceptIds.includes(id));

      if (sourceConceptIds.length > 0) {
        await tx.prerequisiteConcept.createMany({
          data: sourceConceptIds.map((conceptId) => ({
            prerequisiteId: targetId,
            conceptId,
          })),
          skipDuplicates: true,
        });
      }

      // Delete source prerequisite's concept links
      await tx.prerequisiteConcept.deleteMany({
        where: { prerequisiteId: sourceId },
      });

      // Transfer generated questions
      await tx.questionCard.updateMany({
        where: { prerequisiteId: sourceId },
        data: { prerequisiteId: targetId },
      });

      // Delete source prerequisite
      await tx.prerequisite.delete({
        where: { id: sourceId },
      });

      // Log audit trail
      await this.auditLogService.logAction({
        entityType: 'PREREQUISITE',
        entityId: targetId,
        action: 'MERGE',
        userId: 'admin',
        details: {
          sourceId,
          sourceName: source.name,
          targetId,
          targetName: target.name,
          edgesTransferred: source.edges.length,
          conceptsTransferred: sourceConceptIds.length,
        },
      });

      this.logger.log(
        `Prerequisite ${sourceId} merged into ${targetId} successfully`,
      );
    });
  }

  async searchPrerequisites(query: string, limit: number = 20) {
    return this.prisma.prerequisite.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        canonicalKey: true,
        _count: {
          select: {
            edges: true,
            concepts: true,
          },
        },
      },
      take: limit,
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Reprocess questions for a newly created concept or alias
   * SAFE: Only processes questions with unresolved hints that match the concept
   * NON-DESTRUCTIVE: Never changes topic/subtopic, only resolves concepts
   */
  async reprocessQuestionsForConcept(
    conceptId: string,
    options: {
      dryRun?: boolean;
      maxQuestions?: number;
    } = {},
  ) {
    const { dryRun = false, maxQuestions = 100 } = options;

    this.logger.log(
      `Reprocessing questions for concept ${conceptId} (dryRun: ${dryRun}, max: ${maxQuestions})`,
    );

    // 1. Get concept with all aliases
    const concept = await this.prisma.concept.findUnique({
      where: { id: conceptId },
      include: {
        aliases: {
          where: { isActive: true },
          select: { alias: true, normalizedAlias: true },
        },
      },
    });

    if (!concept) {
      throw new NotFoundException(`Concept ${conceptId} not found`);
    }

    // Build search terms (preferredLabel + all aliases)
    const searchTerms = [
      concept.preferredLabel.toLowerCase().trim(),
      concept.normalizedLabel,
      ...concept.aliases.map((a) => a.normalizedAlias),
    ];

    this.logger.log(
      `Searching for unresolved hints matching: ${searchTerms.join(', ')}`,
    );

    // 2. Find unresolved hints that match this concept
    const matchedHints = await this.prisma.unresolvedConceptHint.findMany({
      where: {
        status: 'PENDING',
        OR: searchTerms.map((term) => ({
          normalizedHint: {
            contains: term,
            mode: 'insensitive' as const,
          },
        })),
      },
      include: {
        question: {
          select: {
            id: true,
            lessonId: true,
            topicId: true,
            subtopicId: true,
            analysisStatus: true,
            concepts: {
              select: { conceptId: true },
            },
          },
        },
      },
      take: maxQuestions,
    });

    this.logger.log(`Found ${matchedHints.length} matching hints`);

    if (matchedHints.length === 0) {
      return {
        conceptId,
        dryRun,
        matchedHints: [],
        affectedQuestions: 0,
        processedQuestions: 0,
        skippedQuestions: 0,
        createdQuestionConceptLinks: 0,
        upgradedPrerequisites: 0,
        unresolvedRemaining: 0,
      };
    }

    // 3. Group by question and filter
    const questionMap = new Map<string, typeof matchedHints>();
    let skippedQuestions = 0;

    for (const hint of matchedHints) {
      if (!hint.question) continue;

      const question = hint.question;

      // RULE 5: Skip if concept already linked
      if (question.concepts.some((c) => c.conceptId === conceptId)) {
        skippedQuestions++;
        continue;
      }

      // RULE 1: Only ANALYZED or NEEDS_REVIEW questions
      if (
        question.analysisStatus !== 'ANALYZED' &&
        question.analysisStatus !== 'NEEDS_REVIEW'
      ) {
        skippedQuestions++;
        continue;
      }

      if (!questionMap.has(question.id)) {
        questionMap.set(question.id, []);
      }
      questionMap.get(question.id)!.push(hint);
    }

    this.logger.log(
      `Processing ${questionMap.size} questions, skipped ${skippedQuestions}`,
    );

    if (dryRun) {
      return {
        conceptId,
        dryRun: true,
        matchedHints: matchedHints.map((h) => h.hint),
        affectedQuestions: questionMap.size,
        processedQuestions: 0,
        skippedQuestions,
        createdQuestionConceptLinks: questionMap.size,
        upgradedPrerequisites: 0,
        unresolvedRemaining: matchedHints.length,
      };
    }

    // 4. Process each question (NON-DRY RUN)
    let processedQuestions = 0;
    let createdLinks = 0;
    let upgradedPrerequisites = 0;

    for (const [questionId, hints] of questionMap.entries()) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Create QuestionConcept link if not exists
          const existingLink = await tx.questionConcept.findUnique({
            where: {
              questionId_conceptId: {
                questionId,
                conceptId,
              },
            },
          });

          if (!existingLink) {
            await tx.questionConcept.create({
              data: {
                questionId,
                conceptId,
                confidence: 0.9, // High confidence since it matched unresolved hint
              },
            });
            createdLinks++;
          }

          // Mark hints as RESOLVED
          await tx.unresolvedConceptHint.updateMany({
            where: {
              id: { in: hints.map((h) => h.id) },
            },
            data: {
              status: 'RESOLVED',
              updatedAt: new Date(),
            },
          });

          // Upgrade related prerequisites from label-only to concept-backed
          const question = hints[0].question!;
          const prerequisites = await tx.prerequisite.findMany({
            where: {
              edges: {
                some: {
                  topicId: question.topicId!,
                  subtopicId: question.subtopicId,
                },
              },
              canonicalKey: {
                not: {
                  startsWith: 'concept:',
                },
              },
            },
            include: {
              concepts: true,
            },
          });

          // Link concept to prerequisites that don't have it yet
          for (const prereq of prerequisites) {
            if (!prereq.concepts.some((c) => c.conceptId === conceptId)) {
              await tx.prerequisiteConcept.create({
                data: {
                  prerequisiteId: prereq.id,
                  conceptId,
                },
              });

              // Update canonical key to concept-based
              await tx.prerequisite.update({
                where: { id: prereq.id },
                data: {
                  canonicalKey: `concept:${conceptId}`,
                  status: 'ACTIVE',
                },
              });

              upgradedPrerequisites++;
            }
          }
        });

        processedQuestions++;
      } catch (error) {
        this.logger.error(
          `Failed to process question ${questionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // 5. Get remaining unresolved hints
    const remainingHints = await this.prisma.unresolvedConceptHint.count({
      where: { status: 'PENDING' },
    });

    const result = {
      conceptId,
      dryRun: false,
      matchedHints: matchedHints.map((h) => h.hint),
      affectedQuestions: questionMap.size,
      processedQuestions,
      skippedQuestions,
      createdQuestionConceptLinks: createdLinks,
      upgradedPrerequisites,
      unresolvedRemaining: remainingHints,
    };

    this.logger.log(
      `Reprocessing complete: ${processedQuestions} processed, ${createdLinks} links created, ${upgradedPrerequisites} prerequisites upgraded`,
    );

    return result;
  }

  /**
   * Get count of unresolved hints that match a concept
   */
  async getUnresolvedHintsForConcept(conceptId: string) {
    // Get concept with aliases
    const concept = await this.prisma.concept.findUnique({
      where: { id: conceptId },
      include: {
        aliases: {
          where: { isActive: true },
          select: { normalizedAlias: true },
        },
      },
    });

    if (!concept) {
      throw new NotFoundException(`Concept ${conceptId} not found`);
    }

    // Build search terms
    const searchTerms = [
      concept.normalizedLabel,
      ...concept.aliases.map((a) => a.normalizedAlias),
    ];

    // Count matching hints
    const count = await this.prisma.unresolvedConceptHint.count({
      where: {
        status: 'PENDING',
        OR: searchTerms.map((term) => ({
          normalizedHint: {
            contains: term,
            mode: 'insensitive' as const,
          },
        })),
      },
    });

    return count;
  }

  /**
   * Validate whether a proposed topic/subtopic should be created
   * Uses AI to evaluate based on naming conventions and existing topics
   */
  async validateTopicOrSubtopic(params: {
    lessonId: string;
    proposedName: string;
    parentTopicId?: string;
  }) {
    this.logger.log(
      `Validating ${params.parentTopicId ? 'subtopic' : 'topic'}: "${params.proposedName}"`,
    );

    // Get lesson
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: params.lessonId },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson ${params.lessonId} not found`);
    }

    // Get existing topics in lesson
    const existingTopics = await this.prisma.topic.findMany({
      where: { lessonId: params.lessonId },
      select: { name: true },
    });

    let parentTopic: { name: string } | null = null;
    let existingSubtopics: { name: string }[] = [];

    // If validating a subtopic, get parent and siblings
    if (params.parentTopicId) {
      parentTopic = await this.prisma.topic.findUnique({
        where: { id: params.parentTopicId },
        select: { name: true },
      });

      if (!parentTopic) {
        throw new NotFoundException(
          `Parent topic ${params.parentTopicId} not found`,
        );
      }

      existingSubtopics = await this.prisma.subtopic.findMany({
        where: { topicId: params.parentTopicId },
        select: { name: true },
      });
    }

    // Build AI prompt
    const prompt = buildTopicValidationPrompt({
      lesson: lesson.name,
      proposedName: params.proposedName,
      parentTopic: parentTopic?.name,
      existingTopics: existingTopics.map((t) => t.name),
      existingSubtopics: existingSubtopics.map((s) => s.name),
    });

    // Call AI
    const response = await this.aiRouter.runTask(
      'KNOWLEDGE_EXTRACTION' as AITaskType,
      {
        content: prompt,
        lesson: lesson.name,
      },
      'OPENAI',
    );

    // Parse AI response
    try {
      const content =
        typeof response === 'string'
          ? response
          : (response as any).content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const result = JSON.parse(jsonMatch[0]);

      this.logger.log(
        `Validation result: ${result.decision} - ${result.reason}`,
      );

      return {
        decision: result.decision as 'TOPIC' | 'SUBTOPIC' | 'REJECT',
        reason: result.reason,
        confidence: result.confidence || 0.8,
        suggestion: result.suggestion,
      };
    } catch (error) {
      this.logger.error(
        `Failed to parse AI validation response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Fallback to allowing creation with low confidence
      return {
        decision: params.parentTopicId ? 'SUBTOPIC' : 'TOPIC',
        reason: 'AI validation failed, allowing creation with low confidence',
        confidence: 0.5,
      };
    }
  }

  async createTopic(params: {
    lessonId: string;
    name: string;
    displayName?: string;
  }) {
    // Verify lesson exists
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: params.lessonId },
      select: { id: true, name: true },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson ${params.lessonId} not found`);
    }

    // Check for duplicate topic name in this lesson
    const existing = await this.prisma.topic.findFirst({
      where: {
        lessonId: params.lessonId,
        name: params.name,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Topic "${params.name}" already exists in this lesson`,
      );
    }

    // Create topic
    const topic = await this.prisma.topic.create({
      data: {
        name: params.name,
        displayName: params.displayName || null,
        lessonId: params.lessonId,
      },
      include: {
        lesson: {
          select: { name: true, displayName: true },
        },
      },
    });

    this.logger.log(`Created topic "${topic.name}" in lesson "${lesson.name}"`);

    return topic;
  }

  async createSubtopic(params: {
    topicId: string;
    name: string;
    displayName?: string;
  }) {
    // Verify topic exists
    const topic = await this.prisma.topic.findUnique({
      where: { id: params.topicId },
      include: {
        lesson: {
          select: { name: true },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException(`Topic ${params.topicId} not found`);
    }

    // Check for duplicate subtopic name in this topic
    const existing = await this.prisma.subtopic.findFirst({
      where: {
        topicId: params.topicId,
        name: params.name,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Subtopic "${params.name}" already exists in this topic`,
      );
    }

    // Create subtopic
    const subtopic = await this.prisma.subtopic.create({
      data: {
        name: params.name,
        displayName: params.displayName || null,
        topicId: params.topicId,
      },
      include: {
        topic: {
          include: {
            lesson: {
              select: { name: true, displayName: true },
            },
          },
        },
      },
    });

    this.logger.log(
      `Created subtopic "${subtopic.name}" in topic "${topic.name}" (lesson: "${topic.lesson?.name || 'Unknown'}")`,
    );

    return subtopic;
  }

  // ============================================
  // SPATIAL ANATOMY ANALYTICS
  // ============================================

  /**
   * Get QuestionCard performance analytics by anatomy region
   * Groups questions by spatial context concepts and calculates correct rate
   * Used for: identifying weak anatomy regions, prerequisite-spatial correlations
   */
  async getSpatialAnatomyAnalytics(filters?: {
    lessonId?: string;
    minAttempts?: number;
  }) {
    const minAttempts = filters?.minAttempts || 10;

    // Fetch all spatial contexts with question stats
    const spatialContexts =
      await this.prisma.generatedQuestionSpatialContext.findMany({
        where: {
          questionCard: {
            approvalStatus: 'APPROVED',
            sourceType: { not: 'EXAM_REPLICA' }, // Exclude exam replicas from analytics
            timesShown: { gte: minAttempts },
            ...(filters?.lessonId && { lessonId: filters.lessonId }),
          },
        },
        include: {
          concept: {
            select: {
              id: true,
              preferredLabel: true,
              normalizedLabel: true,
            },
          },
          questionCard: {
            select: {
              id: true,
              timesShown: true,
              correctRate: true,
              difficulty: true,
              lessonId: true,
              lesson: {
                select: { name: true },
              },
            },
          },
        },
      });

    // Group by concept
    const conceptStats = new Map<
      string,
      {
        conceptId: string;
        conceptLabel: string;
        questionsCount: number;
        totalAttempts: number;
        avgCorrectRate: number;
        difficultyDistribution: {
          EASY: number;
          MEDIUM: number;
          HARD: number;
        };
        lessonDistribution: Record<string, number>;
      }
    >();

    for (const sc of spatialContexts) {
      if (!sc.questionCard) continue;

      const conceptId = sc.concept.id;

      if (!conceptStats.has(conceptId)) {
        conceptStats.set(conceptId, {
          conceptId,
          conceptLabel: sc.concept.preferredLabel,
          questionsCount: 0,
          totalAttempts: 0,
          avgCorrectRate: 0,
          difficultyDistribution: { EASY: 0, MEDIUM: 0, HARD: 0 },
          lessonDistribution: {},
        });
      }

      const stats = conceptStats.get(conceptId)!;
      stats.questionsCount++;
      stats.totalAttempts += sc.questionCard.timesShown;
      stats.avgCorrectRate +=
        (sc.questionCard.correctRate || 0) * sc.questionCard.timesShown;

      // Track difficulty
      if (sc.questionCard.difficulty) {
        stats.difficultyDistribution[sc.questionCard.difficulty]++;
      }

      // Track lesson
      const lessonName = sc.questionCard.lesson.name;
      stats.lessonDistribution[lessonName] =
        (stats.lessonDistribution[lessonName] || 0) + 1;
    }

    // Calculate averages
    const results = Array.from(conceptStats.values()).map((stats) => {
      stats.avgCorrectRate =
        stats.totalAttempts > 0
          ? stats.avgCorrectRate / stats.totalAttempts
          : 0;
      return stats;
    });

    // Sort by weakness (lowest correct rate first)
    results.sort((a, b) => a.avgCorrectRate - b.avgCorrectRate);

    this.logger.log(
      `Spatial anatomy analytics: ${results.length} concepts analyzed`,
    );

    return {
      concepts: results,
      summary: {
        totalConcepts: results.length,
        weakestConcept:
          results.length > 0
            ? {
                label: results[0].conceptLabel,
                correctRate: results[0].avgCorrectRate,
              }
            : null,
        strongestConcept:
          results.length > 0
            ? {
                label: results[results.length - 1].conceptLabel,
                correctRate: results[results.length - 1].avgCorrectRate,
              }
            : null,
      },
    };
  }

  /**
   * Get user weakness patterns correlated with spatial contexts
   * Shows which anatomy regions users struggle with most
   */
  async getUserSpatialWeaknesses(userId: string, limit = 10) {
    // Get user's weak knowledge points
    const weaknesses = await this.prisma.userWeakness.findMany({
      where: {
        userId,
        weaknessScore: { gte: 0.5 },
        totalAttempts: { gte: 3 },
      },
      include: {
        knowledgePoint: {
          include: {
            questionKnowledgePoints: {
              include: {
                questionCard: {
                  include: {
                    spatialContexts: {
                      include: {
                        concept: {
                          select: { id: true, preferredLabel: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        weaknessScore: 'desc',
      },
      take: limit,
    });

    // Map weaknesses to spatial contexts
    const spatialWeaknesses = weaknesses
      .map((weakness) => {
        const spatialConcepts = new Set<string>();

        for (const qkp of weakness.knowledgePoint.questionKnowledgePoints) {
          if (qkp.questionCard) {
            for (const sc of qkp.questionCard.spatialContexts) {
              spatialConcepts.add(sc.concept.preferredLabel);
            }
          }
        }

        return {
          knowledgePointId: weakness.knowledgePointId,
          fact: weakness.knowledgePoint.fact,
          weaknessScore: weakness.weaknessScore,
          incorrectCount: weakness.incorrectCount,
          totalAttempts: weakness.totalAttempts,
          spatialConcepts: Array.from(spatialConcepts),
        };
      })
      .filter((w) => w.spatialConcepts.length > 0);

    this.logger.log(
      `User ${userId} spatial weaknesses: ${spatialWeaknesses.length} weak knowledge points with spatial context`,
    );

    return spatialWeaknesses;
  }

  /**
   * Get prerequisite-spatial correlation analysis
   * Shows which prerequisites are linked to which anatomy regions
   * Used for: targeted anatomy study plans, prerequisite blocking
   */
  async getPrerequisiteSpatialCorrelations(filters?: {
    prerequisiteId?: string;
    lessonId?: string;
  }) {
    const where: any = {
      approvalStatus: 'APPROVED',
      prerequisiteId: { not: null },
    };

    if (filters?.prerequisiteId) {
      where.prerequisiteId = filters.prerequisiteId;
    }
    if (filters?.lessonId) {
      where.lessonId = filters.lessonId;
    }

    const questions = await this.prisma.questionCard.findMany({
      where,
      include: {
        prerequisite: {
          select: { id: true, name: true },
        },
        spatialContexts: {
          include: {
            concept: {
              select: { id: true, preferredLabel: true },
            },
          },
        },
      },
    });

    // Group by prerequisite -> spatial concepts
    const correlations = new Map<
      string,
      {
        prerequisiteId: string;
        prerequisiteName: string;
        spatialConcepts: Map<string, { label: string; questionCount: number }>;
      }
    >();

    for (const q of questions) {
      if (!q.prerequisite) continue;

      const prereqId = q.prerequisite.id;

      if (!correlations.has(prereqId)) {
        correlations.set(prereqId, {
          prerequisiteId: prereqId,
          prerequisiteName: q.prerequisite.name,
          spatialConcepts: new Map(),
        });
      }

      const corr = correlations.get(prereqId)!;

      for (const sc of q.spatialContexts) {
        const conceptId = sc.concept.id;
        const existing = corr.spatialConcepts.get(conceptId);

        if (existing) {
          existing.questionCount++;
        } else {
          corr.spatialConcepts.set(conceptId, {
            label: sc.concept.preferredLabel,
            questionCount: 1,
          });
        }
      }
    }

    // Format output
    const results = Array.from(correlations.values()).map((corr) => ({
      prerequisiteId: corr.prerequisiteId,
      prerequisiteName: corr.prerequisiteName,
      spatialConcepts: Array.from(corr.spatialConcepts.values()).sort(
        (a, b) => b.questionCount - a.questionCount,
      ),
      totalQuestions: questions.filter(
        (q) => q.prerequisiteId === corr.prerequisiteId,
      ).length,
    }));

    this.logger.log(
      `Prerequisite-spatial correlations: ${results.length} prerequisites analyzed`,
    );

    return results;
  }
}
