/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from '../queue/queues';
import { AIRouterService } from '../ai/ai-router.service';
import { AITaskType } from '../ai/types';
import * as crypto from 'crypto';

export interface ExtractedKnowledgePoint {
  normalizedKey: string;
  title: string;
  statement: string;
  tags?: string[];
  lesson?: string;
  topic?: string;
  subtopic?: string;
}

export interface KnowledgeExtractionResponse {
  requiresSplit?: boolean;
  knowledge_points: Array<{
    normalizedKey?: string;
    title?: string;
    statement: string;
    tags?: string[];
    lesson?: string;
    topic?: string;
    subtopic?: string;
  }>;
}

@Injectable()
export class KnowledgeExtractionService {
  private readonly logger = new Logger(KnowledgeExtractionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRouter: AIRouterService,
    @InjectQueue(QueueName.KNOWLEDGE_EXTRACTION)
    private readonly knowledgeExtractionQueue: Queue,
    @InjectQueue(QueueName.FLASHCARD_GENERATION)
    private readonly flashcardGenerationQueue: Queue,
    @InjectQueue(QueueName.QUESTION_GENERATION)
    private readonly questionGenerationQueue: Queue,
  ) {
    this.logger.log('Knowledge extraction service initialized with AI Router');
  }

  /**
   * Generate normalized key from statement
   */
  private generateNormalizedKey(statement: string): string {
    // Normalize Turkish characters
    const turkishMap: Record<string, string> = {
      ı: 'i',
      İ: 'i',
      ş: 's',
      Ş: 's',
      ğ: 'g',
      Ğ: 'g',
      ü: 'u',
      Ü: 'u',
      ö: 'o',
      Ö: 'o',
      ç: 'c',
      Ç: 'c',
    };

    let normalized = statement
      .toLowerCase()
      .split('')
      .map((char) => turkishMap[char] || char)
      .join('');

    // Remove special characters, keep only alphanumeric and spaces
    normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');

    // Remove common stop words
    const stopWords = [
      've',
      'veya',
      'bir',
      'bu',
      'şu',
      'o',
      'ile',
      'için',
      'gibi',
      'kadar',
      'daha',
      'en',
      'çok',
      'az',
    ];
    const words = normalized
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.includes(word));

    // Join and limit length
    normalized = words.join('-').substring(0, 100);

    // If still empty, use hash
    if (!normalized || normalized.length < 3) {
      const hash = crypto
        .createHash('sha256')
        .update(statement)
        .digest('hex')
        .substring(0, 16);
      return `kp-${hash}`;
    }

    return normalized;
  }

  /**
   * Extract knowledge points from text using LLM
   */
  async extractKnowledgePoints(
    approvedContentId: string,
  ): Promise<ExtractedKnowledgePoint[]> {
    try {
      this.logger.log(
        `Extracting knowledge points for approvedContent: ${approvedContentId}`,
      );

      // Get ApprovedContent with related data
      const approvedContent = await this.prisma.approvedContent.findUnique({
        where: { id: approvedContentId },
        include: {
          block: {
            include: {
              lesson: true,
              topic: true,
              subtopic: true,
              page: {
                include: {
                  batch: true,
                },
              },
            },
          },
        },
      });

      if (!approvedContent) {
        throw new NotFoundException(
          `ApprovedContent ${approvedContentId} not found`,
        );
      }

      const content = approvedContent.content;
      if (!content || content.trim().length === 0) {
        this.logger.warn(`ApprovedContent ${approvedContentId} has no content`);
        return [];
      }

      // Get classification info from ParsedBlock
      const block = approvedContent.block;
      const lesson = block.lesson?.name;
      const topic = block.topic?.name;
      const subtopic = block.subtopic?.name;
      const contentType = block.contentType;
      const blockType = approvedContent.blockType;

      // Use AI Router with context IDs
      const response = await this.aiRouter.runTask(
        AITaskType.KNOWLEDGE_EXTRACTION,
        {
          content,
          contentType: contentType || undefined,
          blockType: blockType || undefined,
          lesson,
          topic,
          subtopic,
          batchId: approvedContent.batchId,
          pageId: block.pageId,
          topicId: subtopic || topic || undefined, // Use subtopic or topic as topicId
        },
      );

      // Extract JSON from response
      let jsonContent = response;
      if (response.includes('```json')) {
        const jsonStart = response.indexOf('```json') + 7;
        const jsonEnd = response.indexOf('```', jsonStart);
        jsonContent = response.substring(jsonStart, jsonEnd).trim();
      } else if (response.includes('```')) {
        const jsonStart = response.indexOf('```') + 3;
        const jsonEnd = response.indexOf('```', jsonStart);
        jsonContent = response.substring(jsonStart, jsonEnd).trim();
      }

      const extractionResponse = JSON.parse(
        jsonContent,
      ) as KnowledgeExtractionResponse;

      // Check if content requires splitting (MIXED_CONTENT)
      if (extractionResponse.requiresSplit === true) {
        this.logger.warn(
          `Content requires splitting (MIXED_CONTENT) for approvedContent: ${approvedContentId}`,
        );
        // Return empty array - content should be split first
        return [];
      }

      // Process and validate extracted knowledge points
      const knowledgePoints: ExtractedKnowledgePoint[] = [];

      for (const kp of extractionResponse.knowledge_points || []) {
        // Generate normalizedKey if not provided or validate it
        const normalizedKey =
          kp.normalizedKey || this.generateNormalizedKey(kp.statement);

        // Use classification from block if not provided
        const finalLesson = kp.lesson || lesson || undefined;
        const finalTopic = kp.topic || topic || undefined;
        const finalSubtopic = kp.subtopic || subtopic || undefined;

        knowledgePoints.push({
          normalizedKey,
          title: kp.title || kp.statement.substring(0, 100),
          statement: kp.statement,
          tags: kp.tags || [],
          lesson: finalLesson,
          topic: finalTopic,
          subtopic: finalSubtopic,
        });
      }

      this.logger.log(
        `Extracted ${knowledgePoints.length} knowledge points for approvedContent: ${approvedContentId}`,
      );

      return knowledgePoints;
    } catch (error) {
      this.logger.error(
        `Failed to extract knowledge points for approvedContent ${approvedContentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Save knowledge points to database with upsert logic
   */
  async saveKnowledgePoints(
    approvedContentId: string,
    knowledgePoints: ExtractedKnowledgePoint[],
  ): Promise<number> {
    try {
      this.logger.log(
        `Saving ${knowledgePoints.length} knowledge points for approvedContent: ${approvedContentId}`,
      );

      // Get ApprovedContent to access blockId and confidence
      const approvedContent = await this.prisma.approvedContent.findUnique({
        where: { id: approvedContentId },
        include: {
          block: {
            select: {
              id: true,
              lessonId: true,
              topic: true,
              subtopic: true,
              confidence: true, // OCR confidence
            },
          },
        },
      });

      if (!approvedContent) {
        throw new NotFoundException(
          `ApprovedContent ${approvedContentId} not found`,
        );
      }

      const blockId = approvedContent.blockId;
      let savedCount = 0;
      const knowledgePointIdsForFlashcards: string[] = [];
      const knowledgePointIdsForQuestions: string[] = [];

      for (const kp of knowledgePoints) {
        try {
          // Upsert by normalizedKey
          // If exists, update; if not, create new
          const existing = await this.prisma.knowledgePoint.findUnique({
            where: { normalizedKey: kp.normalizedKey },
            include: {
              flashcards: {
                select: { id: true },
                take: 1,
              },
              questionKnowledgePoints: {
                where: { relationshipType: 'MEASURED' },
                select: { id: true },
                take: 1,
              },
            },
          });

          let knowledgePointId: string;
          let isNew = false;
          let priority = 0;

          // Get classification confidence from block (use OCR confidence as proxy)
          const classificationConfidence =
            approvedContent.block.confidence || null;
          const topicId = kp.topic
            ? await this.prisma.topic.findUnique({
                where: {
                  name_lessonId: {
                    name: kp.topic,
                    lessonId: approvedContent.block.lessonId,
                  },
                },
                select: { id: true },
              })
            : null;

          const subtopicId = kp.subtopic
            ? await this.prisma.subtopic.findUnique({
                where: {
                  name_topicId: {
                    name: kp.subtopic,
                    topicId: topicId?.id || '',
                  },
                },
                select: { id: true },
              })
            : null;
          if (existing) {
            // Update existing knowledge point with new content and source
            // This maintains the most recent source traceability
            // Increment sourceCount when updating from a new source
            await this.prisma.knowledgePoint.update({
              where: { id: existing.id },
              data: {
                fact: kp.statement,
                topicId: topicId?.id || null,
                subtopicId: subtopicId?.id || null,
                approvedContentId,
                blockId,
                classificationConfidence:
                  classificationConfidence || existing.classificationConfidence,
                sourceCount: {
                  increment: 1, // Increment source count
                },
              },
            });
            knowledgePointId = existing.id;
            priority = existing.priority;
            this.logger.debug(
              `Updated existing knowledge point: ${kp.normalizedKey}`,
            );

            // Check if flashcards are missing
            if (existing.flashcards.length === 0) {
              knowledgePointIdsForFlashcards.push(knowledgePointId);
            }

            // Check if question is missing (only for high priority points or if no question exists)
            if (existing.questionKnowledgePoints.length === 0) {
              // Only generate questions for high priority points (priority > 0) or if explicitly needed
              if (priority > 0) {
                knowledgePointIdsForQuestions.push(knowledgePointId);
              }
            }
          } else {
            // Create new knowledge point with confidence and source tracking
            const newKp = await this.prisma.knowledgePoint.create({
              data: {
                source: 'APPROVED_CONTENT',
                approvedContentId,
                blockId,
                normalizedKey: kp.normalizedKey,
                fact: kp.statement,
                topicId: topicId?.id || null,
                subtopicId: subtopicId?.id || null,
                priority: 0,
                classificationConfidence: classificationConfidence || null,
                sourceCount: 1, // First source
                lessonId: approvedContent.block.lessonId,
              },
            });
            knowledgePointId = newKp.id;
            isNew = true;
            priority = 0;
            this.logger.debug(
              `Created new knowledge point: ${kp.normalizedKey} with confidence: ${classificationConfidence}`,
            );

            // New knowledge points always need flashcards
            knowledgePointIdsForFlashcards.push(knowledgePointId);

            // For new knowledge points, only generate questions if they're marked as high priority
            // (This can be configured later via a flag or priority setting)
            // For now, we'll skip question generation for new points unless priority > 0
          }

          savedCount++;
        } catch (error) {
          // Log error but continue with other knowledge points
          this.logger.error(
            `Failed to save knowledge point ${kp.normalizedKey}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // NOTE: Flashcard and question generation are now MANUAL ONLY
      // Admin must trigger generation via /admin/topics/:topicId/generate-flashcards
      // and /admin/topics/:topicId/generate-questions endpoints
      if (knowledgePointIdsForFlashcards.length > 0) {
        this.logger.debug(
          `${knowledgePointIdsForFlashcards.length} knowledge points need flashcards (manual generation required)`,
        );
      }
      if (knowledgePointIdsForQuestions.length > 0) {
        this.logger.debug(
          `${knowledgePointIdsForQuestions.length} knowledge points need questions (manual generation required)`,
        );
      }

      this.logger.log(
        `Saved ${savedCount}/${knowledgePoints.length} knowledge points for approvedContent: ${approvedContentId}`,
      );

      return savedCount;
    } catch (error) {
      this.logger.error(
        `Failed to save knowledge points for approvedContent ${approvedContentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Generate Knowledge Points from ExamQuestion analysis (Anatomy only)
   * Extracts spotRule, clinicalCorrelation, and examTrap.keyDifference
   */
  async generateKnowledgePointsFromExamQuestion(
    examQuestionId: string,
  ): Promise<any> {
    this.logger.log(
      `Generating knowledge points from exam question: ${examQuestionId}`,
    );

    // Fetch exam question with relations
    const examQuestion = await this.prisma.examQuestion.findUnique({
      where: { id: examQuestionId },
      include: {
        lesson: true,
        topic: true,
        subtopic: true,
      },
    });

    if (!examQuestion) {
      throw new NotFoundException(`ExamQuestion ${examQuestionId} not found`);
    }

    // Validation 1: Must be analyzed
    if (examQuestion.analysisStatus !== 'ANALYZED') {
      throw new BadRequestException(
        `ExamQuestion must be ANALYZED first. Current status: ${examQuestion.analysisStatus}`,
      );
    }

    // Validation 2: Must have analysisPayload
    if (!examQuestion.analysisPayload) {
      throw new BadRequestException(
        `ExamQuestion ${examQuestionId} has no analysisPayload`,
      );
    }

    const hasKnowledgePoints = await this.prisma.knowledgePoint.findFirst({
      where: { createdFromExamQuestionId: examQuestionId },
    });

    if (hasKnowledgePoints) {
      this.logger.warn('Knowledge points already exist for this ExamQuestion');

      throw new BadRequestException(
        `Knowledge points have already been generated for ExamQuestion ${examQuestionId}`,
      );
    }
    switch (examQuestion.lesson?.name) {
      case 'Anatomi':
        return await this.anatomiQuestionToKnowledgePointTemplate(
          examQuestion,
          examQuestionId,
        );
      case 'Fizyoloji':
        return await this.fizyolojiQuestionToKnowledgePointTemplate(
          examQuestion,
          examQuestionId,
        );
      default:
        throw new BadRequestException(
          `ExamQuestion ${examQuestionId} is not an anatomy question`,
        );
    }
  }

  /**
   * Queue knowledge point generation for multiple exam questions (bulk operation)
   */
  async queueKnowledgePointGenerationForExamQuestions(
    examQuestionIds: string[],
  ): Promise<{
    queued: number;
    skipped: number;
    jobIds: string[];
    errors: Array<{ examQuestionId: string; reason: string }>;
  }> {
    this.logger.log(
      `Queueing knowledge point generation for ${examQuestionIds.length} exam questions`,
    );

    const jobIds: string[] = [];
    const errors: Array<{ examQuestionId: string; reason: string }> = [];

    // Validate all exam questions before queueing
    const validExamQuestions: string[] = [];

    for (const examQuestionId of examQuestionIds) {
      try {
        // Check if exam question exists and is analyzed
        const examQuestion = await this.prisma.examQuestion.findUnique({
          where: { id: examQuestionId },
          select: {
            id: true,
            analysisStatus: true,
            analysisPayload: true,
            _count: {
              select: { knowledgePoints: true },
            },
          },
        });

        if (!examQuestion) {
          errors.push({
            examQuestionId,
            reason: 'Exam question not found',
          });
          continue;
        }

        if (examQuestion.analysisStatus !== 'ANALYZED') {
          errors.push({
            examQuestionId,
            reason: `Exam question not analyzed (status: ${examQuestion.analysisStatus})`,
          });
          continue;
        }

        if (!examQuestion.analysisPayload) {
          errors.push({
            examQuestionId,
            reason: 'Exam question has no analysisPayload',
          });
          continue;
        }

        // Skip if already has knowledge points (optional - can be removed to allow regeneration)
        if (examQuestion._count.knowledgePoints > 0) {
          errors.push({
            examQuestionId,
            reason: `Already has ${examQuestion._count.knowledgePoints} knowledge points`,
          });
          continue;
        }

        validExamQuestions.push(examQuestionId);
      } catch (error) {
        errors.push({
          examQuestionId,
          reason: error instanceof Error ? error.message : 'Validation failed',
        });
      }
    }

    // Queue valid exam questions using addBulk for performance
    if (validExamQuestions.length > 0) {
      const jobs = validExamQuestions.map((examQuestionId) => ({
        name: 'extract-knowledge-exam-question',
        data: { examQuestionId },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential' as const, delay: 2000 },
          jobId: `kp-gen-${examQuestionId}`,
        },
      }));

      const queuedJobs = await this.knowledgeExtractionQueue.addBulk(jobs);
      jobIds.push(...queuedJobs.map((job) => job.id || ''));

      this.logger.log(
        `Successfully queued ${validExamQuestions.length} exam questions for knowledge point generation`,
      );
    }

    return {
      queued: validExamQuestions.length,
      skipped: errors.length,
      jobIds,
      errors,
    };
  }

  async anatomiQuestionToKnowledgePointTemplate(
    examQuestion: any,
    examQuestionId,
  ) {
    if (!examQuestion.analysisPayload) {
      throw new BadRequestException(
        `ExamQuestion ${examQuestionId} has no analysisPayload`,
      );
    }

    const payload = examQuestion.analysisPayload;
    const createdKpIds: string[] = [];
    let spotRuleCount = 0;
    let clinicalCorrelationCount = 0;
    let examTrapCount = 0;

    if (
      payload.spotRule &&
      typeof payload.spotRule === 'string' &&
      payload.spotRule.trim().length > 0
    ) {
      const normalizedKey = this.generateNormalizedKey(payload.spotRule);

      const kp = await this.prisma.knowledgePoint.upsert({
        where: { normalizedKey },
        create: {
          normalizedKey,
          fact: payload.spotRule.trim(),
          source: 'EXAM_ANALYSIS',
          lessonId: examQuestion.lessonId,
          topicId: examQuestion.topicId,
          subtopicId: examQuestion.subtopicId,
          createdFromExamQuestionId: examQuestionId,
          priority: 5, // Default priority for exam-derived KPs
          examRelevance: 0.8, // High exam relevance
          examPattern: payload.patternType || null,
          sourceCount: 1,
        },
        update: {
          sourceCount: { increment: 1 },
          priority: { increment: 1 }, // Increase priority when seen multiple times
          examRelevance: 0.9, // Boost relevance if seen again
          examPattern: payload.patternType || undefined,
        },
      });

      const examQuestionKp =
        await this.prisma.examQuestionKnowledgePoint.create({
          data: {
            examQuestionId,
            knowledgePointId: kp.id,
            relationshipType: 'MEASURED',
          },
        });

      createdKpIds.push(kp.id);
      spotRuleCount++;
      this.logger.debug(`Created/Updated KP from spotRule: ${normalizedKey}`);
    }

    // Extract 2: clinicalCorrelation
    if (
      payload.clinicalCorrelation &&
      typeof payload.clinicalCorrelation === 'string' &&
      payload.clinicalCorrelation.trim().length > 0
    ) {
      const normalizedKey = this.generateNormalizedKey(
        payload.clinicalCorrelation,
      );

      const kp = await this.prisma.knowledgePoint.upsert({
        where: { normalizedKey },
        create: {
          normalizedKey,
          fact: payload.clinicalCorrelation.trim(),
          source: 'EXAM_ANALYSIS',
          lessonId: examQuestion.lessonId,
          topicId: examQuestion.topicId,
          subtopicId: examQuestion.subtopicId,
          createdFromExamQuestionId: examQuestionId,
          priority: 6, // Clinical correlations are high priority
          examRelevance: 0.85,
          examPattern: payload.patternType || null,
          sourceCount: 1,
        },
        update: {
          sourceCount: { increment: 1 },
          priority: { increment: 1 },
          examRelevance: 0.95,
          examPattern: payload.patternType || undefined,
        },
      });

      const examQuestionKp =
        await this.prisma.examQuestionKnowledgePoint.create({
          data: {
            examQuestionId,
            knowledgePointId: kp.id,
            relationshipType: 'MEASURED',
          },
        });

      createdKpIds.push(kp.id);
      clinicalCorrelationCount++;
      this.logger.debug(
        `Created/Updated KP from clinicalCorrelation: ${normalizedKey}`,
      );
    }

    // Extract 3: examTrap.keyDifference
    if (
      payload.examTrap?.keyDifference &&
      typeof payload.examTrap.keyDifference === 'string' &&
      payload.examTrap.keyDifference.trim().length > 0
    ) {
      const normalizedKey = this.generateNormalizedKey(
        payload.examTrap.keyDifference,
      );

      const kp = await this.prisma.knowledgePoint.upsert({
        where: { normalizedKey },
        create: {
          normalizedKey,
          fact: payload.examTrap.keyDifference.trim(),
          source: 'EXAM_ANALYSIS',
          lessonId: examQuestion.lessonId,
          topicId: examQuestion.topicId,
          subtopicId: examQuestion.subtopicId,
          createdFromExamQuestionId: examQuestionId,
          priority: 7, // Exam traps are highest priority
          examRelevance: 0.9,
          examPattern: payload.patternType || null,
          sourceCount: 1,
        },
        update: {
          sourceCount: { increment: 1 },
          priority: { increment: 2 }, // Higher boost for traps
          examRelevance: 1.0, // Maximum relevance
          examPattern: payload.patternType || undefined,
        },
      });

      const examQuestionKp =
        await this.prisma.examQuestionKnowledgePoint.create({
          data: {
            examQuestionId,
            knowledgePointId: kp.id,
            relationshipType: 'TRAP', // Different relationship type for traps
          },
        });

      createdKpIds.push(kp.id);
      examTrapCount++;
      this.logger.debug(`Created/Updated KP from examTrap: ${normalizedKey}`);
    }

    if (payload.options && Array.isArray(payload.options)) {
      // optionAnalysis döngüsü içinde:
      for (const opt of payload.optionAnalysis) {
        // 1. KRİTER: Bilgi atomik ve değerli mi?
        const isHighImportance =
          opt.importance === 'HIGH' || opt.importance === 'MEDIUM';
        const isCorrectAnswer = opt.wouldBeCorrectIf.includes('Correct Answer');
        const hasSubstantialFact =
          opt.wouldBeCorrectIf !== 'N/A' && opt.wouldBeCorrectIf.length > 25;

        if ((isHighImportance && hasSubstantialFact) || isCorrectAnswer) {
          // 2. İşlem: Clinical Outcome'dan Klinik KP Üret
          const normalizedKey = this.generateNormalizedKey(opt.clinicalOutcome);
          if (opt.clinicalOutcome && opt.importance === 'HIGH') {
            const kp = await this.prisma.knowledgePoint.upsert({
              where: { normalizedKey },
              create: {
                normalizedKey,
                fact: opt.clinicalOutcome,
                priority: 6, // Klinik öncelik
                source: 'EXAM_ANALYSIS',
                lessonId: examQuestion.lessonId,
                topicId: examQuestion.topicId,
                subtopicId: examQuestion.subtopicId,
                createdFromExamQuestionId: examQuestionId,
                examRelevance: 0.9,
                examPattern: payload.patternType || null,
                sourceCount: 1,
              },
              update: {
                sourceCount: { increment: 1 },
                priority: { increment: 2 }, // Higher boost for traps
                examRelevance: 1.0, // Maximum relevance
                examPattern: payload.patternType || undefined,
              },
            });
            const examQuestionKp =
              await this.prisma.examQuestionKnowledgePoint.create({
                data: {
                  examQuestionId,
                  knowledgePointId: kp.id,
                  relationshipType: 'CLINICAL_OUTCOME', // Different relationship type for traps
                },
              });
          }

          // 3. İşlem: WouldBeCorrectIf'ten Spot KP Üret
          if (hasSubstantialFact && !isCorrectAnswer) {
            const kp = await this.prisma.knowledgePoint.upsert({
              where: { normalizedKey },
              create: {
                normalizedKey,
                fact: opt.clinicalOutcome,
                priority: 6, // Klinik öncelik
                source: 'EXAM_ANALYSIS',
                lessonId: examQuestion.lessonId,
                topicId: examQuestion.topicId,
                subtopicId: examQuestion.subtopicId,
                createdFromExamQuestionId: examQuestionId,
                examRelevance: 0.9,
                examPattern: payload.patternType || null,
                sourceCount: 1,
              },
              update: {
                sourceCount: { increment: 1 },
                priority: { increment: 2 }, // Higher boost for traps
                examRelevance: 1.0, // Maximum relevance
                examPattern: payload.patternType || undefined,
              },
            });
            await this.prisma.examQuestionKnowledgePoint.create({
              data: {
                examQuestionId,
                knowledgePointId: kp.id,
                relationshipType: 'CLINICAL_OUTCOME', // Different relationship type for traps
              },
            });
          }
        }
      }
    }

    this.logger.log(
      `Generated ${createdKpIds.length} KPs from exam question ${examQuestionId}: ` +
        `${spotRuleCount} spotRule, ${clinicalCorrelationCount} clinicalCorrelation, ${examTrapCount} examTrap`,
    );

    return {
      knowledgePoints: createdKpIds,
      spotRuleCount,
      clinicalCorrelationCount,
      examTrapCount,
    };
  }
  async fizyolojiQuestionToKnowledgePointTemplate(
    examQuestion: any,
    examQuestionId: string,
  ): Promise<any> {
    // Fizyoloji için lesson kontrolü sonrası:
    if (!examQuestion.analysisPayload) {
      throw new BadRequestException(
        `ExamQuestion ${examQuestionId} has no analysisPayload`,
      );
    }

    const payload = examQuestion.analysisPayload;
    const createdKpIds: string[] = [];
    console.log(payload);

    // AI ile Knowledge Point Extraction
    try {
      this.logger.log(
        `Using AI to extract knowledge points from physiology question: ${examQuestionId}`,
      );

      // Send raw exam question data; AI router will select lesson-specific prompt
      const aiResponse = await this.aiRouter.runTask(
        AITaskType.KNOWLEDGE_EXTRACTION,
        {
          question: examQuestion.question,
          options: examQuestion.options || {},
          correctAnswer: examQuestion.correctAnswer,
          explanation: examQuestion.explanation,
          analysisPayload: payload,
          lesson: examQuestion.lesson?.name,
          topic: examQuestion.topic?.name,
          subtopic: examQuestion.subtopic?.name,
        },
      );

      this.logger.debug(
        `AI Knowledge Extraction Response: ${JSON.stringify(aiResponse)}`,
      );

      console.log(aiResponse);

      // Parse AI response
      let extractedKPs: any;
      if (typeof aiResponse === 'string') {
        extractedKPs = JSON.parse(aiResponse);
      } else {
        extractedKPs = aiResponse;
      }

      if (
        !extractedKPs.knowledgePoints ||
        !Array.isArray(extractedKPs.knowledgePoints)
      ) {
        throw new Error('Invalid AI response format');
      }

      this.logger.log(
        `AI extracted ${extractedKPs.knowledgePoints.length} knowledge points`,
      );

      // Create knowledge points from AI extraction
      for (const kpData of extractedKPs.knowledgePoints) {
        if (!kpData.fact || !kpData.normalizedKey) {
          this.logger.warn('Skipping invalid knowledge point:', kpData);
          continue;
        }

        const kp = await this.prisma.knowledgePoint.upsert({
          where: { normalizedKey: kpData.normalizedKey },
          create: {
            normalizedKey: kpData.normalizedKey,
            fact: kpData.fact.trim(),
            source: 'EXAM_ANALYSIS',
            lessonId: examQuestion.lessonId,
            topicId: examQuestion.topicId,
            subtopicId: examQuestion.subtopicId,
            createdFromExamQuestionId: examQuestionId,
            priority: kpData.priority || 7,
            examRelevance: kpData.examRelevance || 0.85,
            examPattern: kpData.examPattern || payload.patternType || null,
            sourceCount: 1,
          },
          update: {
            sourceCount: { increment: 1 },
            priority: { increment: 1 },
            examRelevance: Math.max(
              kpData.examRelevance || 0.85,
              0.9,
            ) as number,
            examPattern: kpData.examPattern || payload.patternType || undefined,
          },
        });

        await this.prisma.examQuestionKnowledgePoint.create({
          data: {
            examQuestionId,
            knowledgePointId: kp.id,
            relationshipType: kpData.relationshipType || 'MEASURED',
          },
        });

        createdKpIds.push(kp.id);
        this.logger.debug(
          `Created/Updated KP from AI extraction (${kpData.sourceType}): ${kpData.normalizedKey}`,
        );
      }

      this.logger.log(
        `Successfully created ${createdKpIds.length} knowledge points using AI for question ${examQuestionId}`,
      );

      return {
        knowledgePoints: createdKpIds,
        aiExtracted: true,
      };
    } catch (aiError) {
      this.logger.error(
        `AI extraction failed for question ${examQuestionId}: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`,
      );
      this.logger.warn('Falling back to template-based extraction');
    }

    return {
      knowledgePoints: createdKpIds,
    };
  }
}
