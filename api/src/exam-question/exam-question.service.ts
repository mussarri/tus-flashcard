/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  NotImplementedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from '../queue/queues';
import { AIRouterService } from '../ai/ai-router.service';
import { AITaskType } from '../ai/types';
import {
  CreateExamQuestionDto,
  UpdateExamQuestionDto,
  ExamQuestionListQueryDto,
} from '../admin/dto/exam-question.dto';
import {
  AliasLanguage,
  AliasSource,
  AnalysisStatus,
  ConceptStatus,
  ConceptType,
} from '@prisma/client';
import { BulkParserService, ParsedQuestion } from './bulk-parser.service';
import { buildQuestionCardPrompt } from '../ai/prompts/question-card.prompt';
import { normalizeConceptKey } from '../common/normalize/normalize-concept-key';
import { PrerequisiteLearningService } from './prerequisite-learning.service';
import { UnresolvedHintsService } from '../admin/unresolved-hints/unresolved-hints.service';
export interface TrapAnalysis {
  option: string;
  reason: string;
  confusion: string;
}

export interface ExamQuestionAnalysisResult {
  lesson?: string;
  topic?: string;
  subtopic?: string;
  concepts?: string[]; // Primary concepts tested in this question
  traps?: TrapAnalysis[];
  explanationSuggestion?: string;

  // Prerequisite information
  prerequisiteConcepts?: string[]; // Concepts student must know first
  prerequisiteReasoning?: string; // Why these prerequisites matter
  prerequisiteConfidence?: number; // AI confidence (0.0-1.0)

  // Exam Pattern Recognition
  patternType?: string; // Exam pattern type (e.g., FORAMEN_CONTENTS for anatomy)
  patternConfidence?: number; // AI confidence in pattern classification (0.0-1.0)
  // Anatomy-specific fields
  spotRule?: string;
  optionAnalysis?: Array<{
    option: string;
    structure?: string;
    wouldBeCorrectIf: string;
    clinicalOutcome?: string;
    examFrequency?: 'HIGH' | 'MEDIUM' | 'LOW';
    confusionRisk?: 'HIGH' | 'LOW';
    importance?: 'HIGH' | 'LOW';
  }>;
  prerequisites?: Array<{
    label?: string;
    conceptHints?: string[];
  }>; // Prerequisite knowledge items for anatomy questions
  spatialContext?: string[];
  clinicalCorrelation?: string;
  examTrap?: { confusedWith: string; keyDifference: string };

  clinicalPathologicalCorrelation?: string;
}

@Injectable()
export class ExamQuestionService {
  private readonly logger = new Logger(ExamQuestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QueueName.EXAM_QUESTION_ANALYSIS)
    private readonly examQuestionAnalysisQueue: Queue,
    @Inject(forwardRef(() => AIRouterService))
    private readonly aiRouter: AIRouterService,
    private readonly bulkParser: BulkParserService,
    private readonly prerequisiteLearningService: PrerequisiteLearningService,
    private readonly unresolvedHintsService: UnresolvedHintsService, // Assume this service exists
  ) {}

  /**
   * Create a new exam question
   */
  async createExamQuestion(dto: CreateExamQuestionDto, uploadedBy: string) {
    this.logger.log(
      `Creating exam question: ${dto.year} - ${dto.examType || 'N/A'}`,
    );

    // Validate options
    const optionKeys = Object.keys(dto.options);
    if (optionKeys.length < 2 || optionKeys.length > 5) {
      throw new BadRequestException(
        'Options must have 2-5 choices (A, B, C, D, E)',
      );
    }

    if (!optionKeys.includes(dto.correctAnswer)) {
      throw new BadRequestException(
        `Correct answer ${dto.correctAnswer} not found in options`,
      );
    }

    if (!dto.lessonId) {
      throw new BadRequestException('Lesson ID is required');
    }

    const examQuestion = await this.prisma.examQuestion.create({
      data: {
        year: dto.year,
        examType: dto.examType,
        questionNumber: dto.questionNumber,
        question: dto.question,
        options: dto.options,
        correctAnswer: dto.correctAnswer,
        explanation: dto.explanation,
        topicId: null,
        subtopicId: null,
        traps: [],
        uploadedBy,
        analysisStatus: AnalysisStatus.PENDING,
        lessonId: dto?.lessonId || '0',
      },
    });

    this.logger.log(`Created exam question: ${examQuestion.id}`);

    return examQuestion;
  }

  /**
   * Get exam questions with filters
   */
  async getExamQuestions(query: ExamQuestionListQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.year) {
      where.year = query.year;
    }

    if (query.examType) {
      where.examType = query.examType;
    }

    // Support name-based search for lesson (case-insensitive partial match)
    if (query.lessonId) {
      where.lesson = {
        name: {
          contains: query.lessonId,
          mode: 'insensitive',
        },
      };
    }

    // Support name-based search for topic (case-insensitive partial match)
    if (query.topicId) {
      where.topic = {
        name: {
          contains: query.topicId,
          mode: 'insensitive',
        },
      };
    }

    if (query.analysisStatus) {
      where.analysisStatus = query.analysisStatus;
    }

    // Date filters
    if (query.createdAfter || query.createdBefore) {
      where.createdAt = {};
      if (query.createdAfter) {
        where.createdAt.gte = new Date(query.createdAfter);
      }
      if (query.createdBefore) {
        where.createdAt.lte = new Date(query.createdBefore);
      }
    }

    if (query.updatedAfter || query.updatedBefore) {
      where.updatedAt = {};
      if (query.updatedAfter) {
        where.updatedAt.gte = new Date(query.updatedAfter);
      }
      if (query.updatedBefore) {
        where.updatedAt.lte = new Date(query.updatedBefore);
      }
    }

    // Knowledge points filter
    if (
      query.hasKnowledgePoints !== undefined &&
      query.hasKnowledgePoints !== ''
    ) {
      const hasKP = query.hasKnowledgePoints === 'true';

      where.knowledgePoints = hasKP
        ? { some: {} } // Returns records that have at least one link
        : { none: {} }; // Returns records that have zero links
    }

    // Dynamic sorting
    const sortBy = query.sortBy || 'year';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: any = {};

    if (sortBy === 'year') {
      orderBy.year = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'updatedAt') {
      orderBy.updatedAt = sortOrder;
    } else if (sortBy === 'questionNumber') {
      orderBy.questionNumber = sortOrder;
    }

    const [examQuestions, total] = await Promise.all([
      this.prisma.examQuestion.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          lesson: true,
          topic: true,
          subtopic: true,
          _count: {
            select: {
              knowledgePoints: true,
            },
          },
        },
      }),
      this.prisma.examQuestion.count({ where }),
    ]);

    return {
      examQuestions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get exam question by ID
   */
  async getExamQuestionById(id: string) {
    const examQuestion = await this.prisma.examQuestion.findUnique({
      where: { id },
      include: {
        knowledgePoints: {
          include: {
            knowledgePoint: {
              select: {
                id: true,
                fact: true,
                topicId: true,
                subtopicId: true,
              },
            },
          },
        },
        concepts: {
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
        },
        subtopic: true,
        topic: true,
        lesson: true,
      },
    });

    if (!examQuestion) {
      throw new NotFoundException(`Exam question not found: ${id}`);
    }

    return examQuestion;
  }

  /**
   * Update exam question
   */
  async updateExamQuestion(id: string, dto: UpdateExamQuestionDto) {
    const examQuestion = await this.prisma.examQuestion.findUnique({
      where: { id },
    });

    if (!examQuestion) {
      throw new NotFoundException(`Exam question not found: ${id}`);
    }

    // Validate options if provided
    if (dto.options) {
      const optionKeys = Object.keys(dto.options);
      if (optionKeys.length < 2 || optionKeys.length > 5) {
        throw new BadRequestException(
          'Options must have 2-5 choices (A, B, C, D, E)',
        );
      }

      if (dto.correctAnswer && !optionKeys.includes(dto.correctAnswer)) {
        throw new BadRequestException(
          `Correct answer ${dto.correctAnswer} not found in options`,
        );
      }
    }

    const updated = await this.prisma.examQuestion.update({
      where: { id },
      data: {
        ...(dto.year !== undefined && { year: dto.year }),
        ...(dto.examType !== undefined && { examType: dto.examType }),
        ...(dto.questionNumber !== undefined && {
          questionNumber: dto.questionNumber,
        }),
        ...(dto.question !== undefined && { question: dto.question }),
        ...(dto.options !== undefined && { options: dto.options }),
        ...(dto.correctAnswer !== undefined && {
          correctAnswer: dto.correctAnswer,
        }),
        ...(dto.explanation !== undefined && { explanation: dto.explanation }),
        ...(dto.lessonId !== undefined && { lessonId: dto.lessonId }),
        ...(dto.subtopicId !== undefined && { subtopicId: dto.subtopicId }),
        ...(dto.traps !== undefined && { traps: dto.traps }),
        ...(dto.topicId !== undefined && { topicId: dto.topicId }),
      },
    });

    this.logger.log(`Updated exam question: ${id}`);

    return updated;
  }

  /**
   * Delete exam question
   */
  async deleteExamQuestion(id: string) {
    const examQuestion = await this.prisma.examQuestion.findUnique({
      where: { id },
    });

    if (!examQuestion) {
      throw new NotFoundException(`Exam question not found: ${id}`);
    }

    await this.prisma.examQuestion.delete({
      where: { id },
    });

    this.logger.log(`Deleted exam question: ${id}`);

    return { success: true };
  }

  /**
   * Trigger AI analysis for an exam question
   */
  async triggerAnalysis(examQuestionId: string, lessonId: string) {
    const examQuestion = await this.prisma.examQuestion.findUnique({
      where: { id: examQuestionId },
    });

    if (!examQuestion) {
      throw new NotFoundException(`Exam question not found: ${examQuestionId}`);
    }

    // Check if already processing or completed
    if (examQuestion.analysisStatus === AnalysisStatus.PROCESSING) {
      throw new BadRequestException('Analysis already in progress');
    }

    if (examQuestion.analysisStatus === AnalysisStatus.ANALYZED) {
      this.logger.warn(
        `Analysis already completed for exam question: ${examQuestionId}`,
      );
    }

    // If lesson is provided, update the exam question with the lesson before analysis
    if (lessonId) {
      await this.prisma.examQuestion.update({
        where: { id: examQuestionId },
        data: { lessonId },
      });
      this.logger.log(
        `Updated lesson to ${lessonId} for exam question: ${examQuestionId}`,
      );
    }

    // Add job to queue
    await this.examQuestionAnalysisQueue.add(
      'analyze-exam-question',
      { examQuestionId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    this.logger.log(
      `Queued analysis for exam question: ${examQuestionId}${lessonId ? ` with lesson: ${lessonId}` : ''}`,
    );

    return {
      success: true,
      examQuestionId,
      message: 'Analysis queued',
    };
  }

  /**
   * Analyze exam question (called by processor)
   */
  async analyzeExamQuestion(
    examQuestionId: string,
  ): Promise<ExamQuestionAnalysisResult> {
    this.logger.log(`Analyzing exam question: ${examQuestionId}`);

    const examQuestion = await this.prisma.examQuestion.findUnique({
      where: { id: examQuestionId },
      include: {
        topic: {
          include: {
            lesson: true,
          },
        },
        subtopic: true,
        lesson: true,
      },
    });

    const lessonId = examQuestion?.lessonId;

    if (!lessonId) {
      throw new BadRequestException(
        'Lesson is required for exam question analysis.',
      );
    }

    if (!examQuestion) {
      throw new NotFoundException(`Exam question not found: ${examQuestionId}`);
    }

    if (!examQuestion?.topic?.lesson && !examQuestion?.lessonId) {
      throw new BadRequestException(
        'Lesson is required for exam question analysis.',
      );
    }

    // Mark as PROCESSING
    await this.prisma.examQuestion.update({
      where: { id: examQuestionId },
      data: { analysisStatus: AnalysisStatus.PROCESSING },
    });

    try {
      /* =========================
       1️⃣ PREREQUISITE CONTEXT
    ========================== */
      let prerequisiteContext;
      if (examQuestion.topicId) {
        prerequisiteContext = await this.prisma.prerequisiteTopicEdge.findMany({
          where: {
            topicId: examQuestion.topicId,
          },
          include: {
            prerequisite: true,
            topic: true,
          },
        });
      } else {
        prerequisiteContext = [];
      }

      /* =========================
       2️⃣ AI ANALYSIS (WITH PREREQUISITE CONTEXT)
    ========================== */
      const rawAIResponse = await this.aiRouter.runTask(
        AITaskType.EXAM_QUESTION_ANALYSIS,
        {
          question: examQuestion.question,
          options: examQuestion.options as Record<string, string>,
          correctAnswer: examQuestion.correctAnswer,
          explanation: examQuestion.explanation || undefined,
          year: examQuestion.year,
          examType: examQuestion.examType || undefined,
          lesson: examQuestion.lesson?.name || undefined,
          topic: examQuestion.topic?.name || undefined,
          subtopic: examQuestion.subtopic?.name || undefined,
          examQuestionId,
          // Pass prerequisite context to AI for better reasoning
          prerequisiteContext: prerequisiteContext.map((edge) => ({
            prerequisiteTopic: edge.prerequisite?.name,
            targetTopic: edge.topic?.name,
            subtopic: edge.subtopic,
            frequency: edge.frequency,
          })),
        },
      );
      console.log(rawAIResponse);

      /* =========================
       3️⃣ PARSE AI JSON
    ========================== */
      let analysis: ExamQuestionAnalysisResult;

      try {
        let jsonString = rawAIResponse.trim();

        if (jsonString.startsWith('```')) {
          jsonString = jsonString
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/, '');
        }

        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace >= 0) {
          jsonString = jsonString.substring(firstBrace, lastBrace + 1);
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        analysis = JSON.parse(jsonString) as ExamQuestionAnalysisResult;
      } catch (err) {
        this.logger.error('AI JSON parse failed');
        this.logger.error(rawAIResponse.substring(0, 1000));

        await this.prisma.examQuestion.update({
          where: { id: examQuestionId },
          data: {
            analysisStatus: AnalysisStatus.FAILED,
            explanation: 'AI JSON parse error. Check logs.',
          },
        });

        throw err;
      }

      /* =========================
       4️⃣ PREPARE UPDATE DATA
    ========================== */
      const updateData: any = {
        patternType: analysis.patternType || null,
        patternConfidence: analysis.patternConfidence || null,
        analysisPayload: analysis,
        analyzedAt: new Date(),
        // State will be determined after all resolution attempts
        analysisStatus: AnalysisStatus.PROCESSING, // Temporary, will be updated later
        topicId: null,
        subtopicId: null,
        unmatchedTopic: null,
        unmatchedSubtopic: null,
        unmatchedConcepts: [],
      };

      /* =========================
       5️⃣ ANATOMY TRAPS
    ========================== */
      if (analysis.lesson === 'Anatomi') {
        updateData.traps = {
          spotRule: analysis.spotRule,
          optionAnalysis: analysis.optionAnalysis || [],
          spatialContext: analysis.spatialContext || [],
          clinicalCorrelation: analysis.clinicalCorrelation,
          examTrap: analysis.examTrap,
        };
      } else {
        updateData.traps = analysis.traps || [];
      }

      /* =========================
       6️⃣ TOPIC RESOLUTION
    ========================== */
      let resolvedTopicId: string | null = null;
      let resolvedTopicName: string | null = null;

      if (analysis.topic) {
        const topic = await this.prisma.topic.findFirst({
          where: {
            lessonId,
            name: analysis.topic,
          },
        });

        if (topic) {
          resolvedTopicId = topic.id;
          resolvedTopicName = topic.name;
          updateData.topicId = topic.id;
        } else {
          updateData.unmatchedTopic = analysis.topic;
        }
      }

      /* =========================
       7️⃣ SUBTOPIC RESOLUTION
      ========================== */
      if (analysis.subtopic && resolvedTopicName) {
        const topicId = await this.prisma.topic.findUnique({
          where: {
            name_lessonId: {
              name: resolvedTopicName,
              lessonId,
            },
          },
          select: { id: true },
        });
        const subtopic = await this.prisma.subtopic.findFirst({
          where: {
            topicId: topicId ? topicId.id : undefined,
            name: analysis.subtopic,
          },
        });

        if (subtopic) {
          updateData.subtopicId = subtopic.id;
        } else {
          updateData.unmatchedSubtopic = analysis.subtopic;
        }
      }

      /* =========================
       7.5️⃣ CONCEPT RESOLUTION
    ========================== */
      const matchedConceptIds: string[] = [];
      const unmatchedConcepts: string[] = [];

      if (analysis.concepts && Array.isArray(analysis.concepts)) {
        for (const conceptName of analysis.concepts) {
          // Try to find concept by normalized label
          const concept = await this.prisma.concept.findFirst({
            where: {
              OR: [
                { preferredLabel: conceptName },
                { normalizedLabel: conceptName.toLowerCase().trim() },
                {
                  aliases: {
                    some: {
                      alias: conceptName,
                      isActive: true,
                    },
                  },
                },
              ],
            },
          });

          if (concept) {
            matchedConceptIds.push(concept.id);
          } else {
            unmatchedConcepts.push(conceptName);
          }
        }
      }

      updateData.unmatchedConcepts = unmatchedConcepts;

      /* =========================
       7.6️⃣ STATE MACHINE VALIDATION
    ========================== */
      // Determine final status based on resolution results
      const hasUnmatched = !!(
        updateData.unmatchedTopic ||
        updateData.unmatchedSubtopic ||
        updateData.unmatchedConcepts?.length > 0
      );

      updateData.analysisStatus = AnalysisStatus.ANALYZED;

      if (hasUnmatched) {
        updateData.analysisStatus = AnalysisStatus.NEEDS_REVIEW;
      }

      this.logger.log(
        `Resolution status for ${examQuestionId}: ` +
          `Topic=${resolvedTopicId ? '✓' : updateData.unmatchedTopic ? '✗' : 'N/A'}, ` +
          `Subtopic=${updateData.subtopicId ? '✓' : updateData.unmatchedSubtopic ? '✗' : 'N/A'}, ` +
          `Concepts=${matchedConceptIds.length}/${(analysis.concepts || []).length}, ` +
          `Status=${updateData.analysisStatus}`,
      );

      /* =========================
       8️⃣ FINAL UPDATE & CONCEPT LINKING
    ========================== */
      const updatedQuestion = await this.prisma.examQuestion.update({
        where: { id: examQuestionId },
        data: updateData,
      });

      // Link matched concepts to exam question
      if (matchedConceptIds.length > 0) {
        await this.prisma.questionConcept.createMany({
          data: matchedConceptIds.map((conceptId) => ({
            questionId: examQuestionId,
            conceptId,
            confidence: 1.0,
          })),
          skipDuplicates: true,
        });
        this.logger.log(
          `Linked ${matchedConceptIds.length} concepts to question ${examQuestionId}`,
        );
      }

      // if (unmatchedConcepts.length > 0) {
      //   for (const conceptName of unmatchedConcepts) {
      //     await this.unresolvedHintsService.recordUnresolvedHint({
      //       hint: conceptName,
      //       questionId: examQuestionId,
      //       lessonId: updatedQuestion.lessonId,
      //       topicId: updatedQuestion.topicId || '',
      //       subtopicId: updatedQuestion.subtopicId || '',
      //     });
      //   }
      // }

      this.logger.log(`Analysis completed: ${examQuestionId}`);

      return analysis;
    } catch (error) {
      this.logger.error(
        `Analysis failed for ${examQuestionId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      await this.prisma.examQuestion.update({
        where: { id: examQuestionId },
        data: { analysisStatus: AnalysisStatus.FAILED },
      });

      throw error;
    }
  }

  /**
   * Link knowledge point to exam question
   */
  async linkKnowledgePoint(
    examQuestionId: string,
    knowledgePointId: string,
    relationshipType: 'MEASURED' | 'TRAP' | 'CONTEXT',
  ) {
    const examQuestion = await this.prisma.examQuestion.findUnique({
      where: { id: examQuestionId },
    });

    if (!examQuestion) {
      throw new NotFoundException(`Exam question not found: ${examQuestionId}`);
    }

    const knowledgePoint = await this.prisma.knowledgePoint.findUnique({
      where: { id: knowledgePointId },
    });

    if (!knowledgePoint) {
      throw new NotFoundException(
        `Knowledge point not found: ${knowledgePointId}`,
      );
    }

    // Check if link already exists
    const existingLink =
      await this.prisma.examQuestionKnowledgePoint.findUnique({
        where: {
          examQuestionId_knowledgePointId_relationshipType: {
            examQuestionId,
            knowledgePointId,
            relationshipType,
          },
        },
      });

    if (existingLink) {
      throw new BadRequestException(
        'Knowledge point already linked with this relationship type',
      );
    }

    const link = await this.prisma.examQuestionKnowledgePoint.create({
      data: {
        examQuestionId,
        knowledgePointId,
        relationshipType,
      },
      include: {
        knowledgePoint: {
          select: {
            id: true,
            fact: true,
            topicId: true,
            subtopicId: true,
          },
        },
      },
    });

    this.logger.log(
      `Linked knowledge point ${knowledgePointId} to exam question ${examQuestionId} with type ${relationshipType}`,
    );

    return link;
  }

  /**
   * Unlink knowledge point from exam question
   */
  async unlinkKnowledgePoint(
    examQuestionId: string,
    knowledgePointId: string,
    relationshipType: 'MEASURED' | 'TRAP' | 'CONTEXT',
  ) {
    const link = await this.prisma.examQuestionKnowledgePoint.findUnique({
      where: {
        examQuestionId_knowledgePointId_relationshipType: {
          examQuestionId,
          knowledgePointId,
          relationshipType,
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Knowledge point link not found');
    }

    await this.prisma.examQuestionKnowledgePoint.delete({
      where: {
        examQuestionId_knowledgePointId_relationshipType: {
          examQuestionId,
          knowledgePointId,
          relationshipType,
        },
      },
    });

    this.logger.log(
      `Unlinked knowledge point ${knowledgePointId} from exam question ${examQuestionId}`,
    );

    return { success: true };
  }

  /**
   * Get knowledge points for exam question
   */
  async getKnowledgePoints(examQuestionId: string) {
    const links = await this.prisma.examQuestionKnowledgePoint.findMany({
      where: { examQuestionId },
      include: {
        knowledgePoint: {
          select: {
            id: true,
            fact: true,
            topicId: true,
            subtopicId: true,
            priority: true,
          },
        },
      },
      orderBy: {
        relationshipType: 'asc',
      },
    });

    return links;
  }

  /**
   * Parse bulk text and return preview
   */
  parseBulkText(text: string) {
    this.logger.log('Parsing bulk text input');
    return this.bulkParser.parseBulkText(text);
  }

  /**
   * Import multiple questions from parsed data
   */
  async bulkImportQuestions(questions: ParsedQuestion[], uploadedBy: string) {
    this.logger.log(`Bulk importing ${questions.length} questions`);

    const results = {
      created: 0,
      failed: 0,
      errors: [] as Array<{ index: number; reason: string }>,
    };

    // Get current year as default if not provided
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < questions.length; i++) {
      const parsed = questions[i];
      try {
        // Validate again before saving
        if (!parsed.correctAnswer) {
          results.failed++;
          results.errors.push({
            index: i + 1,
            reason: 'Correct answer missing',
          });
          continue;
        }

        if (Object.keys(parsed.options).length < 2) {
          results.failed++;
          results.errors.push({
            index: i + 1,
            reason: 'Insufficient options',
          });
          continue;
        }

        // Extract question text (without options) and options
        // The questionText contains the full text including options
        // We need to separate the actual question from the options
        let questionText = parsed.questionText;

        // Remove option lines (A), B), C), D)) from question text
        // Keep the question text but remove the option markers
        const optionPattern = /^([A-D])\)\s*.+$/gim;
        questionText = questionText.replace(optionPattern, '').trim();

        // Clean up extra whitespace
        questionText = questionText.replace(/\n\s*\n/g, '\n').trim();

        await this.prisma.examQuestion.create({
          data: {
            year: parsed.year || currentYear,
            examType: parsed.examType || null,
            questionNumber: parsed.questionNumber || null,
            question: questionText,
            options: parsed.options,
            correctAnswer: parsed.correctAnswer,
            explanation: parsed.explanation || null,
            traps: [],
            uploadedBy,
            analysisStatus: AnalysisStatus.PENDING,
            lessonId: '0', // Default lesson ID, should be updated later
          },
        });

        results.created++;
      } catch (error) {
        this.logger.error(
          `Failed to import question ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        results.failed++;
        results.errors.push({
          index: i + 1,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.log(
      `Bulk import completed: ${results.created} created, ${results.failed} failed`,
    );

    return results;
  }

  /**
   * Generate knowledge points from exam question analysis
   */
  async generateKnowledgeFromExamQuestion(examQuestionId: string) {
    this.logger.log(
      `Generating knowledge points from exam question: ${examQuestionId}`,
    );

    const examQuestion = await this.getExamQuestionById(examQuestionId);

    if (examQuestion.analysisStatus !== AnalysisStatus.ANALYZED) {
      throw new BadRequestException(
        'Exam question must be analyzed before generating knowledge points',
      );
    }

    // TODO: Implement knowledge point generation logic
    // This should extract knowledge points from the question analysis
    // and create KnowledgePoint records linked to this exam question

    throw new NotImplementedException(
      'Knowledge generation is not implemented yet',
    );
  }

  /**
   * Generate a practice question based on exam question
   */
  async generateNewQuestionFromExamQuestion(
    examQuestionId: string,
    provider?: 'OPENAI' | 'GEMINI',
  ) {
    this.logger.log(
      `Generating practice question card from exam question: ${examQuestionId}${
        provider ? ` (provider: ${provider})` : ''
      }`,
    );

    /* =========================
     * 1️⃣ FETCH & GUARDS
     * ========================= */
    const examQuestion = await this.prisma.examQuestion.findUnique({
      where: { id: examQuestionId },
      include: {
        lesson: true,
        topic: true,
        subtopic: true,
        concepts: {
          include: {
            concept: {
              include: {
                prerequisites: {
                  include: { prerequisite: true },
                },
              },
            },
          },
        },
      },
    });

    if (!examQuestion) {
      throw new NotFoundException('Exam question not found');
    }

    if (examQuestion.analysisStatus !== AnalysisStatus.ANALYZED) {
      throw new BadRequestException(
        'Exam question must be analyzed before generating question cards',
      );
    }

    if (!examQuestion.analysisPayload) {
      throw new BadRequestException('Missing analysis payload');
    }

    const payload = examQuestion.analysisPayload as any;

    /* =========================
     * 2️⃣ PREREQUISITE LABELS
     * ========================= */
    const prerequisiteLabels = Array.from(
      new Set(
        examQuestion.concepts
          ?.flatMap((qc) =>
            qc.concept?.prerequisites
              ?.map((pc) => pc.prerequisite?.name)
              .filter(Boolean),
          )
          .flat() || [],
      ),
    ) as string[];

    /* =========================
     * 3️⃣ BUILD AI PROMPT
     * ========================= */

    const { systemPrompt, userPrompt } = buildQuestionCardPrompt({
      examQuestion: {
        question: examQuestion.question,
        options: examQuestion.options as Record<string, string>,
        correctAnswer: examQuestion.correctAnswer,
        year: examQuestion.year,
        analysisPayload: payload,
      },
      topic: examQuestion.topic?.name,
      subtopic: examQuestion.subtopic?.name,
      lesson: examQuestion.lesson?.name || 'General',
      prerequisiteLabels,
    });

    /* =========================
     * 4️⃣ AI GENERATION
     * ========================= */
    const aiResult = await this.aiRouter.runTask(
      AITaskType.QUESTION_GENERATION,
      {
        systemPrompt,
        userPrompt,
        examQuestionId,
      },
      provider,
    );

    let questionCard: any;
    try {
      const content = aiResult.response ?? aiResult.content ?? aiResult;
      questionCard =
        typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      throw new BadRequestException('AI returned invalid JSON');
    }

    if (
      !questionCard?.stem ||
      !questionCard?.options ||
      !questionCard?.correctOption ||
      !questionCard?.mainExplanation
    ) {
      throw new BadRequestException('AI response missing required fields');
    }

    /* =========================
     * 5️⃣ DIFFICULTY
     * ========================= */
    let difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM';
    const confidence = examQuestion.patternConfidence ?? 0.7;

    if (confidence > 0.85) difficulty = 'EASY';
    else if (confidence < 0.65) difficulty = 'HARD';

    if (questionCard.header?.difficulty) {
      difficulty = questionCard.header.difficulty;
    }

    /* =========================
     * 6️⃣ OPTION STRUCTURES
     * ========================= */
    const options: Record<string, string> = {};
    const optionsMetadata: Record<string, any> = {};

    for (const opt of questionCard.options) {
      options[opt.key] = opt.text;

      optionsMetadata[opt.key] = {
        text: opt.text,
        isCorrect: !!opt.isCorrect,
        wouldBeCorrectIf: opt.explanation ?? null,
        clinicalOutcome: opt.clinicalOutcome ?? null,
      };
    }

    /* =========================
     * 7️⃣ TRANSACTION
     * ========================= */
    const result = await this.prisma.$transaction(async (tx) => {
      let knowledgePointId: string | null = null;

      /* ---- 7.1 spotRule → KnowledgePoint ---- */
      if (payload.spotRule?.trim()) {
        const normalized = normalizeConceptKey(payload.spotRule);

        const kp = await tx.knowledgePoint.upsert({
          where: { normalizedKey: normalized },
          update: {},
          create: {
            fact: payload.spotRule.trim(),
            normalizedKey: normalized,
            lessonId: examQuestion.lessonId!,
            topicId: examQuestion.topicId,
            subtopicId: examQuestion.subtopicId,
            source: 'EXAM_ANALYSIS',
          },
        });

        await tx.examQuestionKnowledgePoint.create({
          data: {
            examQuestionId,
            knowledgePointId: kp.id,
            relationshipType: 'MEASURED',
          },
        });

        knowledgePointId = kp.id;
      }

      /* ---- 7.2 GeneratedQuestion ---- */
      const generatedQuestion = await tx.questionCard.create({
        data: {
          sourceType: 'AI_GENERATION',
          question: questionCard.stem,
          options,
          optionsMetadata,
          correctAnswer: questionCard.correctOption,
          mainExplanation: questionCard.mainExplanation,
          difficulty,
          patternType: payload.patternType ?? null,
          clinicalCorrelation: payload.clinicalCorrelation ?? null,
          sourceExamQuestionId: examQuestionId,
          lessonId: examQuestion.lessonId!,
          topicId: examQuestion.topicId,
          subtopicId: examQuestion.subtopicId,
          approvalStatus: 'PENDING',
        },
      });

      /* ---- 7.3 KnowledgePoint ↔ Question ---- */
      if (knowledgePointId) {
        await tx.questionKnowledgePoint.create({
          data: {
            questionCardId: generatedQuestion.id,
            knowledgePointId,
            relationshipType: 'MEASURED',
          },
        });
      }

      /* ---- 7.4 Spatial Context ---- */
      if (Array.isArray(payload.spatialContext)) {
        for (const label of payload.spatialContext) {
          const concept = await tx.concept.findFirst({
            where: {
              OR: [
                { normalizedLabel: normalizeConceptKey(label) },
                {
                  aliases: {
                    some: {
                      normalizedAlias: normalizeConceptKey(label),
                      isActive: true,
                    },
                  },
                },
              ],
            },
          });

          if (concept) {
            await tx.generatedQuestionSpatialContext.create({
              data: {
                questionCardId: generatedQuestion.id,
                conceptId: concept.id,
              },
            });
          } else {
            await tx.unresolvedConceptHint.create({
              data: {
                hint: label,
                normalizedHint: normalizeConceptKey(label),
                questionId: generatedQuestion.id,
                lessonId: examQuestion.lessonId!,
                topicId: examQuestion.topicId,
                subtopicId: examQuestion.subtopicId,
              },
            });
          }
        }
      }

      return { generatedQuestion: questionCard, knowledgePointId };
    });

    /* =========================
     * 8️⃣ RETURN
     * ========================= */
    return {
      success: true,
      questionCard: result.generatedQuestion,
      sourceExamQuestionId: examQuestionId,
      difficulty,
      knowledgePointId: result.knowledgePointId,
    };
  }

  async generateQuestionCardFromExamQuestion(examQuestionId: string) {
    this.logger.log(
      `Generating EXAM-DIRECT question card from exam question: ${examQuestionId}`,
    );

    /* =========================
     * 1️⃣ FETCH & GUARDS
     * ========================= */
    const examQuestion = await this.prisma.examQuestion.findUnique({
      where: { id: examQuestionId },
      include: {
        lesson: true,
        topic: true,
        subtopic: true,
        concepts: true,
      },
    });

    if (!examQuestion) {
      throw new NotFoundException('Exam question not found');
    }

    if (examQuestion.analysisStatus !== AnalysisStatus.ANALYZED) {
      throw new BadRequestException(
        'Exam question must be analyzed before generating a QuestionCard',
      );
    }

    if (!examQuestion.analysisPayload) {
      throw new BadRequestException('Missing analysis payload');
    }

    const existingQuestionCard = await this.prisma.questionCard.findFirst({
      where: {
        sourceExamQuestionId: examQuestionId,
        sourceType: 'EXAM_REPLICA',
      },
    });
    if (existingQuestionCard) {
      throw new BadRequestException(
        'Replica QuestionCard already exists for this exam question',
      );
    }
    const payload = examQuestion.analysisPayload as any;

    /* =========================
     * 2️⃣ OPTIONS & METADATA
     * ========================= */
    const options: Record<string, string> = examQuestion.options as Record<
      string,
      string
    >;

    if (!payload.optionAnalysis || !Array.isArray(payload.optionAnalysis)) {
      throw new BadRequestException(
        'analysisPayload.optionAnalysis is required for EXAM_DIRECT QuestionCard',
      );
    }

    const optionsMetadata: Record<string, any> = {};

    for (const opt of payload.optionAnalysis) {
      optionsMetadata[opt.option] = {
        text: opt.structure,
        isCorrect:
          examQuestion.correctAnswer === opt.option ||
          opt.wouldBeCorrectIf?.includes('correct'),
        wouldBeCorrectIf: opt.wouldBeCorrectIf || null,
        clinicalOutcome: opt.clinicalOutcome || null,
      };
    }

    /* =========================
     * 3️⃣ MAIN EXPLANATION
     * ========================= */
    let mainExplanation = '';

    if (payload.spotRule) {
      mainExplanation += payload.spotRule?.trim();
    }

    if (payload.examTrap?.keyDifference) {
      mainExplanation +=
        '\n\n⚠️ Confused With: ' + payload.examTrap?.confusedWith?.trim();
    }

    if (payload.examTrap?.keyDifference) {
      mainExplanation +=
        '\nExam Trap: ' + payload.examTrap?.keyDifference?.trim();
    }

    if (!mainExplanation) {
      throw new BadRequestException(
        'Cannot generate QuestionCard without spotRule or examTrap',
      );
    }

    /* =========================
     * 4️⃣ TRANSACTION
     * ========================= */
    const result = await this.prisma.$transaction(async (tx) => {
      let knowledgePointId: string | null = null;

      /* ---- 4.1 spotRule → KnowledgePoint ---- */
      if (payload.spotRule?.trim()) {
        const normalized = normalizeConceptKey(payload.spotRule);

        const kp = await tx.knowledgePoint.upsert({
          where: { normalizedKey: normalized },
          update: {},
          create: {
            fact: payload.spotRule.trim(),
            normalizedKey: normalized,
            lessonId: examQuestion.lessonId!,
            topicId: examQuestion.topicId,
            subtopicId: examQuestion.subtopicId,
            source: 'EXAM_ANALYSIS',
          },
        });

        await tx.examQuestionKnowledgePoint.create({
          data: {
            examQuestionId,
            knowledgePointId: kp.id,
            relationshipType: 'MEASURED',
          },
        });

        knowledgePointId = kp.id;
      }

      /* ---- 4.2 Create QuestionCard (GeneratedQuestion) ---- */
      const questionCard = await tx.questionCard.create({
        data: {
          sourceType: 'EXAM_REPLICA',
          question: examQuestion.question.split('A)')[0]?.trim(), // Remove options from question text
          options,
          correctAnswer: examQuestion.correctAnswer,
          optionsMetadata,
          mainExplanation,

          difficulty: examQuestion.patternConfidence
            ? examQuestion.patternConfidence > 0.85
              ? 'EASY'
              : examQuestion.patternConfidence < 0.65
                ? 'HARD'
                : 'MEDIUM'
            : 'MEDIUM',

          patternType: payload.patternType || null,
          clinicalCorrelation: payload.clinicalCorrelation || null,

          sourceExamQuestionId: examQuestionId,
          lessonId: examQuestion.lessonId!,
          topicId: examQuestion.topicId,
          subtopicId: examQuestion.subtopicId,

          approvalStatus: 'APPROVED', // exam-direct → auto approved
        },
      });

      /* ---- 4.3 KnowledgePoint ↔ QuestionCard ---- */
      if (knowledgePointId) {
        await tx.questionKnowledgePoint.create({
          data: {
            questionCardId: questionCard.id,
            knowledgePointId,
            relationshipType: 'MEASURED',
          },
        });
      }

      /* ---- 4.4 Spatial Context ---- */
      if (Array.isArray(payload.spatialContext)) {
        for (const label of payload.spatialContext) {
          const normalized = normalizeConceptKey(label);

          const concept = await tx.concept.findFirst({
            where: {
              OR: [
                { normalizedLabel: normalized },
                {
                  aliases: {
                    some: {
                      normalizedAlias: normalized,
                      isActive: true,
                    },
                  },
                },
              ],
            },
          });

          if (concept) {
            await tx.generatedQuestionSpatialContext.create({
              data: {
                questionCardId: questionCard.id,
                conceptId: concept.id,
              },
            });
          } else {
            const newConcept = await tx.concept.create({
              data: {
                preferredLabel: label,
                normalizedLabel: normalized,
                conceptType: ConceptType.STRUCTURE,
                status: ConceptStatus.NEEDS_REVIEW,
                aliases: {
                  create: {
                    alias: label,
                    normalizedAlias: normalized,
                    language: AliasLanguage.EN,
                    source: AliasSource.ADMIN,
                  },
                },
              },
              include: {
                aliases: true,
              },
            });
            await tx.questionConcept.create({
              data: {
                questionId: examQuestionId,
                conceptId: newConcept.id,
              },
            });
            await tx.generatedQuestionSpatialContext.create({
              data: {
                questionCardId: questionCard.id,
                conceptId: newConcept.id,
              },
            });
          }
        }
      }

      return { questionCard, knowledgePointId };
    });

    /* =========================
     * 5️⃣ RETURN
     * ========================= */
    return {
      success: true,
      questionCard: result.questionCard,
      sourceExamQuestionId: examQuestionId,
      knowledgePointId: result.knowledgePointId,
    };
  }

  /**
   * Get exam questions needing ontology review
   */
  async getQuestionsNeedingReview(lessonId?: string) {
    this.logger.log(
      `Fetching questions needing review${lessonId ? ` for lesson: ${lessonId}` : ''}`,
    );

    return this.prisma.examQuestion.findMany({
      where: {
        analysisStatus: AnalysisStatus.NEEDS_REVIEW,
        ...(lessonId && { lessonId }),
      },
      select: {
        id: true,
        year: true,
        examType: true,
        questionNumber: true,
        question: true,
        lesson: true,
        unmatchedTopic: true,
        unmatchedSubtopic: true,
        unmatchedConcepts: true,
        topic: {
          select: { name: true },
        },
        subtopic: {
          select: { name: true },
        },
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get aggregated unmatched ontology suggestions
   */
  async getUnmatchedOntologySuggestions(filters?: {
    lessonId?: string;
    minOccurrences?: number;
  }) {
    this.logger.log('Fetching unmatched ontology suggestions');

    const questions = await this.prisma.examQuestion.findMany({
      where: {
        analysisStatus: AnalysisStatus.NEEDS_REVIEW,
        ...(filters?.lessonId && { lessonId: filters.lessonId }),
      },
      select: {
        unmatchedTopic: true,
        unmatchedSubtopic: true,
        unmatchedConcepts: true,
        lesson: { select: { name: true } },
      },
    });

    // Aggregate suggestions
    const topicSuggestions = new Map<
      string,
      { count: number; lesson: string }
    >();
    const subtopicSuggestions = new Map<
      string,
      { count: number; lesson: string }
    >();
    const conceptSuggestions = new Map<
      string,
      { count: number; lesson: string }
    >();

    questions.forEach((q) => {
      if (q.unmatchedTopic) {
        const key = `${q.lesson?.name}:${q.unmatchedTopic}`;
        const existing = topicSuggestions.get(key) || {
          count: 0,
          lesson: q.lesson || '',
        };
        topicSuggestions.set(key, {
          count: existing.count + 1,
          lesson: q.lesson?.name || '',
        });
      }
      if (q.unmatchedSubtopic) {
        const key = `${q.lesson?.name}:${q.unmatchedSubtopic}`;
        const existing = subtopicSuggestions.get(key) || {
          count: 0,
          lesson: q.lesson || '',
        };
        subtopicSuggestions.set(key, {
          count: existing.count + 1,
          lesson: q.lesson?.name || '',
        });
      }
      if (q.unmatchedConcepts) {
        q.unmatchedConcepts.forEach((concept) => {
          const key = `${q.lesson?.name}:${concept}`;
          const existing = conceptSuggestions.get(key) || {
            count: 0,
            lesson: q.lesson || '',
          };
          conceptSuggestions.set(key, {
            count: existing.count + 1,
            lesson: q.lesson?.name || '',
          });
        });
      }
    });

    // Filter by minimum occurrences
    const minOccurrences = filters?.minOccurrences || 1;

    return {
      topics: Array.from(topicSuggestions.entries())
        .map(([key, data]) => ({
          name: key.split(':')[1],
          lesson: data.lesson,
          count: data.count,
        }))
        .filter((t) => t.count >= minOccurrences)
        .sort((a, b) => b.count - a.count),
      subtopics: Array.from(subtopicSuggestions.entries())
        .map(([key, data]) => ({
          name: key.split(':')[1],
          lesson: data.lesson,
          count: data.count,
        }))
        .filter((s) => s.count >= minOccurrences)
        .sort((a, b) => b.count - a.count),
      concepts: Array.from(conceptSuggestions.entries())
        .map(([key, data]) => ({
          name: key.split(':')[1],
          lesson: data.lesson,
          count: data.count,
        }))
        .filter((c) => c.count >= minOccurrences)
        .sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Manually resolve ontology mismatches
   */

  async resolveOntologyMismatches(
    examQuestionId: string,
    resolution: {
      topicId?: string;
      subtopicId?: string;
      conceptIds?: string[];
      action: 'APPROVE_AS_IS' | 'REJECT_SUGGESTIONS' | 'RESOLVE';
    },
  ) {
    this.logger.log(`Resolving ontology for question: ${examQuestionId}`);

    const examQuestion = await this.prisma.examQuestion.findUnique({
      where: { id: examQuestionId },
    });

    if (!examQuestion) {
      throw new NotFoundException(`Exam question not found: ${examQuestionId}`);
    }

    if (examQuestion.analysisStatus !== AnalysisStatus.NEEDS_REVIEW) {
      throw new BadRequestException(
        'Question must be in NEEDS_REVIEW status to resolve',
      );
    }

    // =====================================================
    // 1️⃣ REJECT → IGNORED (FINAL STATE)
    // =====================================================
    if (resolution.action === 'REJECT_SUGGESTIONS') {
      await this.prisma.examQuestion.update({
        where: { id: examQuestionId },
        data: {
          unmatchedTopic: null,
          unmatchedSubtopic: null,
          unmatchedConcepts: [],
          analysisStatus: AnalysisStatus.ANALYZED,
        },
      });

      this.logger.log(`Question ${examQuestionId} ignored`);
      return { success: true, action: 'IGNORED' };
    }

    // =====================================================
    // 2️⃣ APPROVE AS-IS → ANALYZED + EDGE
    // =====================================================
    if (resolution.action === 'APPROVE_AS_IS') {
      await this.prisma.examQuestion.update({
        where: { id: examQuestionId },
        data: {
          unmatchedTopic: null,
          unmatchedSubtopic: null,
          unmatchedConcepts: [],
          analysisStatus: AnalysisStatus.ANALYZED,
        },
      });

      // 🔑 EDGE creation ONLY HERE
      await this.prerequisiteLearningService.processAnalyzedQuestion(
        examQuestionId,
      );

      this.logger.log(`Question ${examQuestionId} approved as-is`);
      return { success: true, action: 'APPROVED_AS_IS' };
    }

    // =====================================================
    // 3️⃣ RESOLVE → APPLY FIXES (NO STATE YET)
    // =====================================================
    const updateData: any = {};

    // --- Topic
    if (resolution.topicId) {
      const topic = await this.prisma.topic.findUnique({
        where: { id: resolution.topicId },
      });
      if (!topic) {
        throw new BadRequestException(`Topic not found: ${resolution.topicId}`);
      }
      updateData.topicId = resolution.topicId;
      updateData.unmatchedTopic = null;
    }

    // --- Subtopic
    if (resolution.subtopicId) {
      const subtopic = await this.prisma.subtopic.findUnique({
        where: { id: resolution.subtopicId },
      });
      if (!subtopic) {
        throw new BadRequestException(
          `Subtopic not found: ${resolution.subtopicId}`,
        );
      }
      updateData.subtopicId = resolution.subtopicId;
      updateData.unmatchedSubtopic = null;
    }

    // --- Concepts
    if (resolution.conceptIds && resolution.conceptIds.length > 0) {
      const concepts = await this.prisma.concept.findMany({
        where: { id: { in: resolution.conceptIds } },
      });

      if (concepts.length !== resolution.conceptIds.length) {
        throw new BadRequestException('One or more concepts not found');
      }

      await this.prisma.questionConcept.deleteMany({
        where: { questionId: examQuestionId },
      });

      await this.prisma.questionConcept.createMany({
        data: resolution.conceptIds.map((conceptId) => ({
          questionId: examQuestionId,
          conceptId,
          confidence: 1.0,
        })),
      });

      updateData.unmatchedConcepts = [];
    }

    // =====================================================
    // 4️⃣ FINAL STATE DECISION (SINGLE SOURCE OF TRUTH)
    // =====================================================
    const hasUnmatched =
      (!!examQuestion.unmatchedTopic && !resolution.topicId) ||
      (!!examQuestion.unmatchedSubtopic && !resolution.subtopicId) ||
      (!!examQuestion.unmatchedConcepts?.length &&
        !resolution.conceptIds?.length);

    const finalStatus = hasUnmatched
      ? AnalysisStatus.NEEDS_REVIEW
      : AnalysisStatus.ANALYZED;

    updateData.analysisStatus = finalStatus;

    // =====================================================
    // 5️⃣ UPDATE QUESTION
    // =====================================================
    await this.prisma.examQuestion.update({
      where: { id: examQuestionId },
      data: updateData,
    });

    // =====================================================
    // 6️⃣ EDGE CREATION (GUARDED)
    // =====================================================
    if (
      examQuestion.analysisStatus === AnalysisStatus.NEEDS_REVIEW &&
      finalStatus === AnalysisStatus.ANALYZED
    ) {
      await this.prerequisiteLearningService.processAnalyzedQuestion(
        examQuestionId,
      );
    }

    this.logger.log(
      `Ontology resolved for question ${examQuestionId} → ${finalStatus}`,
    );

    return {
      success: true,
      action: 'RESOLVED',
      status: finalStatus,
    };
  }

  /**
   * Create new ontology entity (Topic, Subtopic, or Concept)
   */
  async createOntologyEntity(data: {
    name: string;
    entityType: 'TOPIC' | 'SUBTOPIC' | 'CONCEPT';
    lessonId?: string;
    topicId?: string;
    subtopicId?: string;
  }) {
    this.logger.log(
      `Creating ${data.entityType}: ${data.name}${data.lessonId ? ` in lesson ${data.lessonId}` : ''}`,
    );

    if (data.entityType === 'TOPIC') {
      if (!data.lessonId) {
        throw new BadRequestException(
          'lessonId is required for creating Topic',
        );
      }

      const lesson = await this.prisma.lesson.findUnique({
        where: { id: data.lessonId },
        select: { id: true, name: true },
      });

      if (!lesson) {
        throw new NotFoundException(`Lesson not found: ${data.lessonId}`);
      }

      // Check for duplicates
      const existing = await this.prisma.topic.findFirst({
        where: {
          name: data.name,
          lessonId: lesson.id,
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Topic "${data.name}" already exists in lesson "${lesson.name}"`,
        );
      }

      const topic = await this.prisma.topic.create({
        data: {
          name: data.name,
          lessonId: lesson.id,
          status: 'ACTIVE',
        },
      });

      this.logger.log(`Created topic: ${topic.id}`);
      return { entityType: 'TOPIC', entity: topic };
    }

    if (data.entityType === 'SUBTOPIC') {
      if (!data.topicId) {
        throw new BadRequestException(
          'topicId is required for creating Subtopic',
        );
      }

      const topic = await this.prisma.topic.findUnique({
        where: { id: data.topicId },
      });

      if (!topic) {
        throw new NotFoundException(`Topic not found: ${data.topicId}`);
      }

      // Check for duplicates
      const existing = await this.prisma.subtopic.findFirst({
        where: {
          name: data.name,
          topicId: topic.id,
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Subtopic "${data.name}" already exists in topic "${topic.name}"`,
        );
      }

      const subtopic = await this.prisma.subtopic.create({
        data: {
          name: data.name,
          topicId: topic.id,
          lessonId: topic.lessonId,
        },
      });

      this.logger.log(`Created subtopic: ${subtopic.id}`);
      return { entityType: 'SUBTOPIC', entity: subtopic };
    }

    if (data.entityType === 'CONCEPT') {
      // Check for duplicates by normalized label
      const normalizedLabel = data.name.toLowerCase().trim();
      const existing = await this.prisma.concept.findFirst({
        where: {
          normalizedLabel,
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Concept "${data.name}" already exists (normalized: ${normalizedLabel})`,
        );
      }

      const concept = await this.prisma.concept.create({
        data: {
          preferredLabel: data.name,
          normalizedLabel,
          conceptType: 'STRUCTURE', // Default type
          status: 'ACTIVE',
        },
      });

      this.logger.log(`Created concept: ${concept.id}`);
      return { entityType: 'CONCEPT' as const, entity: concept };
    }

    // This line should never be reached due to the if checks above
    const exhaustiveCheck: never = data.entityType;
    throw new BadRequestException(
      `Invalid entity type: ${String(exhaustiveCheck)}`,
    );
  }
}
