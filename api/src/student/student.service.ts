/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionCardSource, Difficulty, Prisma } from '@prisma/client';

interface GetQuestionsFilters {
  lessonId?: string;
  topicId?: string;
  subtopicId?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  sourceType?: 'ADMIN' | 'AI_GENERATION' | 'ERROR_BASED' | 'MIXED';
  limit?: number;
  offset?: number;
  userId?: string; // For adaptive filtering
}

interface SubmitAnswerInput {
  userId: string;
  questionId: string;
  selectedAnswer: string;
  timeSpent?: number;
}

/**
 * Student service - handles question solving flow and analytics
 */
@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get APPROVED questions for student practice
   * Only returns questions with approvalStatus = APPROVED
   * Does NOT return correct answer (student must solve)
   */
  async getApprovedQuestions(filters: GetQuestionsFilters) {
    const {
      lessonId,
      topicId,
      subtopicId,
      difficulty,
      sourceType,
      limit = 20,
      offset = 0,
    } = filters;

    const where: Prisma.QuestionCardWhereInput = {
      approvalStatus: 'APPROVED', // CRITICAL: Only approved questions
      // Exclude exam replicas from adaptive feed
    };

    if (lessonId) where.lessonId = lessonId;
    if (topicId) where.topicId = topicId;
    if (subtopicId) where.subtopicId = subtopicId;
    if (difficulty) where.difficulty = difficulty as Difficulty;
    if (sourceType !== 'MIXED')
      where.sourceType = sourceType as QuestionCardSource;

    const [questions, total] = await Promise.all([
      this.prisma.questionCard.findMany({
        where,
        select: {
          id: true,
          question: true,
          options: true,
          // correctAnswer: false, // HIDDEN from student
          difficulty: true,
          sourceType: true,
          patternType: true,
          clinicalCorrelation: true,
          timesShown: true,
          correctRate: true,
          spatialContexts: {
            // ← Ekleyin
            include: {
              concept: {
                select: {
                  id: true,
                  preferredLabel: true,
                  conceptType: true,
                },
              },
            },
          },
          lesson: {
            select: { id: true, name: true },
          },
          topic: {
            select: { id: true, name: true },
          },
          subtopic: {
            select: { id: true, name: true },
          },
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      this.prisma.questionCard.count({ where }),
    ]);

    this.logger.log(
      `Fetched ${questions.length} approved questions (total: ${total})`,
    );

    return {
      questions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get a single question by ID (APPROVED only)
   */
  async getQuestionById(id: string) {
    const question = await this.prisma.questionCard.findUnique({
      where: { id },
      select: {
        id: true,
        question: true,
        options: true,
        // correctAnswer: false, // HIDDEN
        difficulty: true,
        sourceType: true,
        patternType: true,
        clinicalCorrelation: true,
        timesShown: true,
        correctRate: true,
        lesson: {
          select: { id: true, name: true },
        },
        topic: {
          select: { id: true, name: true },
        },
        subtopic: {
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

    if (!question) {
      throw new NotFoundException(`Question ${id} not found`);
    }

    if (question['approvalStatus'] !== 'APPROVED') {
      throw new NotFoundException(
        `Question ${id} is not available for practice`,
      );
    }

    return question;
  }

  /**
   * Submit answer and update all analytics
   * CORE STUDENT FLOW:
   * 1. Create UserAnswer
   * 2. Update QuestionCard stats (timesShown, correctRate)
   * 3. If incorrect: Update UserWeakness for linked KnowledgePoints
   * 4. Return feedback (isCorrect, explanation)
   */
  async submitAnswer(input: SubmitAnswerInput) {
    const { userId, questionId, selectedAnswer, timeSpent } = input;

    return this.prisma.$transaction(async (tx) => {
      // Step 0: Ensure user exists (for testing with mock users)
      await tx.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: `${userId}@test.com`,
          name: 'Test Student',
        },
      });

      // Step 1: Fetch question with correct answer
      const question = await tx.questionCard.findUnique({
        where: { id: questionId },
        include: {
          spatialContexts: {
            include: {
              concept: {
                select: {
                  id: true,
                  preferredLabel: true,
                  conceptType: true,
                },
              },
            },
          },
          questionKnowledgePoints: {
            include: {
              knowledgePoint: {
                select: { id: true, fact: true },
              },
            },
          },
        },
      });

      if (!question) {
        throw new NotFoundException(`Question ${questionId} not found`);
      }

      if (question.approvalStatus !== 'APPROVED') {
        throw new NotFoundException(`Question ${questionId} is not available`);
      }

      const isCorrect = selectedAnswer === question.correctAnswer;

      // Step 2: Create UserAnswer record
      const userAnswer = await tx.userAnswer.create({
        data: {
          userId,
          questionCardId: questionId,
          selectedAnswer,
          isCorrect,
          timeSpent: timeSpent || null,
        },
      });

      this.logger.log(
        `UserAnswer created: ${userAnswer.id} (correct: ${isCorrect})`,
      );

      // Step 3: Update QuestionCard analytics
      const timesShown = question.timesShown + 1;
      const totalCorrect =
        (question.correctRate || 0) * question.timesShown + (isCorrect ? 1 : 0);
      const newCorrectRate = totalCorrect / timesShown;

      await tx.questionCard.update({
        where: { id: questionId },
        data: {
          timesShown,
          correctRate: newCorrectRate,
        },
      });

      this.logger.log(
        `QuestionCard ${questionId} updated: timesShown=${timesShown}, correctRate=${newCorrectRate.toFixed(3)}`,
      );

      // Step 4: If incorrect, update UserWeakness for linked KnowledgePoints
      const affectedKnowledgePoints: string[] = [];

      if (!isCorrect) {
        for (const qkp of question.questionKnowledgePoints) {
          if (qkp.relationshipType === 'MEASURED') {
            // Only track weaknesses for directly measured knowledge
            const knowledgePointId = qkp.knowledgePointId;
            affectedKnowledgePoints.push(knowledgePointId);

            // Upsert UserWeakness
            const existingWeakness = await tx.userWeakness.findUnique({
              where: {
                userId_knowledgePointId: {
                  userId,
                  knowledgePointId,
                },
              },
            });

            if (existingWeakness) {
              // Update existing weakness
              const incorrectCount = existingWeakness.incorrectCount + 1;
              const totalAttempts = existingWeakness.totalAttempts + 1;
              const weaknessScore = incorrectCount / totalAttempts;

              await tx.userWeakness.update({
                where: {
                  userId_knowledgePointId: {
                    userId,
                    knowledgePointId,
                  },
                },
                data: {
                  incorrectCount,
                  totalAttempts,
                  weaknessScore,
                  lastIncorrectAt: new Date(),
                },
              });

              this.logger.log(
                `UserWeakness updated: KP ${knowledgePointId}, score=${weaknessScore.toFixed(3)}`,
              );
            } else {
              // Create new weakness record
              await tx.userWeakness.create({
                data: {
                  userId,
                  knowledgePointId,
                  incorrectCount: 1,
                  totalAttempts: 1,
                  weaknessScore: 1.0,
                  lastIncorrectAt: new Date(),
                },
              });

              this.logger.log(`UserWeakness created: KP ${knowledgePointId}`);
            }
          }
        }
      } else {
        // If correct, still increment totalAttempts (reduces weakness score)
        for (const qkp of question.questionKnowledgePoints) {
          if (qkp.relationshipType === 'MEASURED') {
            const knowledgePointId = qkp.knowledgePointId;

            const existingWeakness = await tx.userWeakness.findUnique({
              where: {
                userId_knowledgePointId: {
                  userId,
                  knowledgePointId,
                },
              },
            });

            if (existingWeakness) {
              const totalAttempts = existingWeakness.totalAttempts + 1;
              const weaknessScore =
                existingWeakness.incorrectCount / totalAttempts;

              await tx.userWeakness.update({
                where: {
                  userId_knowledgePointId: {
                    userId,
                    knowledgePointId,
                  },
                },
                data: {
                  totalAttempts,
                  weaknessScore,
                },
              });

              this.logger.log(
                `UserWeakness improved: KP ${knowledgePointId}, score=${weaknessScore.toFixed(3)}`,
              );
            }
          }
        }
      }

      // Step 5: Return feedback
      return {
        userAnswerId: userAnswer.id,
        isCorrect,
        correctAnswer: question.correctAnswer,
        selectedAnswer,
        explanation: question.explanation || question.mainExplanation,
        optionsMetadata: question.optionsMetadata,
        clinicalCorrelation: question.clinicalCorrelation,
        spatialContexts: question.spatialContexts.map((sc) => ({
          anatomySubject: sc.concept.preferredLabel,
          spatialRelation: 'relates to',
          relatedStructure: sc.concept.conceptType || 'anatomy',
        })),
        timesShown,
        correctRate: newCorrectRate,
        affectedKnowledgePoints,
        knowledgePoints: question.questionKnowledgePoints.map((qkp) => ({
          id: qkp.knowledgePoint.id,
          fact: qkp.knowledgePoint.fact,
          relationshipType: qkp.relationshipType,
        })),
      };
    });
  }

  /**
   * Get user's answer history for a question
   */
  async getAnswerHistory(userId: string, questionId: string) {
    const answers = await this.prisma.userAnswer.findMany({
      where: {
        userId,
        questionCardId: questionId,
      },
      orderBy: {
        answeredAt: 'desc',
      },
      select: {
        id: true,
        selectedAnswer: true,
        isCorrect: true,
        timeSpent: true,
        answeredAt: true,
      },
    });

    const totalAttempts = answers.length;
    const correctAttempts = answers.filter((a) => a.isCorrect).length;
    const successRate = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;

    return {
      answers,
      stats: {
        totalAttempts,
        correctAttempts,
        successRate,
      },
    };
  }

  /**
   * Get user's weak knowledge points
   * Used for targeted practice and ERROR_BASED generation triggers
   */
  async getUserWeaknesses(userId: string, threshold = 0.5, limit = 10) {
    const weaknesses = await this.prisma.userWeakness.findMany({
      where: {
        userId,
        weaknessScore: { gte: threshold },
      },
      include: {
        knowledgePoint: {
          include: {
            lesson: true,
            topic: true,
            subtopic: true,
          },
        },
      },
      orderBy: {
        weaknessScore: 'desc',
      },
      take: limit,
    });

    return weaknesses.map((w) => ({
      knowledgePointId: w.knowledgePointId,
      fact: w.knowledgePoint.fact,
      weaknessScore: w.weaknessScore,
      incorrectCount: w.incorrectCount,
      totalAttempts: w.totalAttempts,
      lastIncorrectAt: w.lastIncorrectAt,
      lesson: w.knowledgePoint.lesson,
      topic: w.knowledgePoint.topic,
      subtopic: w.knowledgePoint.subtopic,
    }));
  }

  async getAllLessons() {
    return this.prisma.lesson.findMany({
      select: {
        id: true,
        name: true,
        topics: {
          where: { mergedInto: null }, // Only topics with questions
          select: {
            id: true,
            name: true,
          },
        },
        // Add more fields if needed
      },
      orderBy: { name: 'asc' },
    });
  }
}
