/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIRouterService } from '../ai/ai-router.service';
import { AITaskType } from '../ai/types';
import { AIProviderType } from '@prisma/client';

export interface GeneratedQuestionData {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation: string;
  scenarioType?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface QuestionGenerationResponse {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation: string;
  scenarioType?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

@Injectable()
export class QuestionGenerationService {
  private readonly logger = new Logger(QuestionGenerationService.name);
  private readonly maxRegenerationAttempts = 5;
  private readonly similarityThreshold = 0.8;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AIRouterService))
    private readonly aiRouter: AIRouterService,
  ) {
    this.logger.log('Question generation service initialized with AI Router');
  }

  /**
   * Compute embedding for a text using AI Router
   * @param text - Text to embed
   * @param providerOverride - Optional provider override (only OpenAI supports embeddings)
   */
  private async computeEmbedding(
    text: string,
    providerOverride?: AIProviderType,
  ): Promise<number[]> {
    try {
      // Embeddings only work with OpenAI, so ignore providerOverride for embeddings
      return await this.aiRouter.runTask(AITaskType.EMBEDDING, { text });
    } catch (error) {
      this.logger.error(
        `Failed to compute embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Compute cosine similarity between two embeddings
   */
  private cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * Check similarity against existing questions
   */
  private async checkSimilarity(
    questionStem: string,
    excludeQuestionId?: string,
  ): Promise<{
    isSimilar: boolean;
    maxSimilarity: number;
    similarQuestionIds: string[];
  }> {
    try {
      // Compute embedding for the new question
      const newEmbedding = await this.computeEmbedding(questionStem);

      // Get existing QuestionCards
      const existingQuestionCards = await this.prisma.questionCard.findMany({
        where: excludeQuestionId
          ? {
              id: { not: excludeQuestionId },
            }
          : undefined,
        select: {
          id: true,
          question: true,
        },
        take: 100, // Limit to avoid too many API calls
      });

      // Get existing ExamQuestions
      const existingExamQuestions = await this.prisma.examQuestion.findMany({
        select: {
          id: true,
          question: true,
        },
        take: 100, // Limit to avoid too many API calls
      });

      let maxSimilarity = 0;
      const similarQuestionIds: string[] = [];

      // Check against QuestionCards
      for (const existing of existingQuestionCards) {
        try {
          const existingEmbedding = await this.computeEmbedding(
            existing.question,
          );
          const similarity = this.cosineSimilarity(
            newEmbedding,
            existingEmbedding,
          );

          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
          }

          if (similarity > this.similarityThreshold) {
            similarQuestionIds.push(existing.id);
          }
        } catch (error) {
          // Log but continue
          this.logger.warn(
            `Failed to compute similarity for QuestionCard ${existing.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Check against ExamQuestions
      for (const existing of existingExamQuestions) {
        try {
          const existingEmbedding = await this.computeEmbedding(
            existing.question,
          );
          const similarity = this.cosineSimilarity(
            newEmbedding,
            existingEmbedding,
          );

          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
          }

          if (similarity > this.similarityThreshold) {
            similarQuestionIds.push(existing.id);
          }
        } catch (error) {
          // Log but continue
          this.logger.warn(
            `Failed to compute similarity for ExamQuestion ${existing.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      return {
        isSimilar: maxSimilarity > this.similarityThreshold,
        maxSimilarity,
        similarQuestionIds,
      };
    } catch (error) {
      this.logger.error(
        `Failed to check similarity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // If similarity check fails, allow the question (fail open)
      return {
        isSimilar: false,
        maxSimilarity: 0,
        similarQuestionIds: [],
      };
    }
  }

  /**
   * Generate question for a knowledge point
   * @param knowledgePointId - The knowledge point ID
   * @param attempt - Regeneration attempt number
   * @param providerOverride - Optional provider override (OPENAI or GEMINI)
   */
  async generateQuestion(
    knowledgePointId: string,
    attempt: number = 1,
    providerOverride?: AIProviderType,
  ): Promise<GeneratedQuestionData> {
    try {
      this.logger.log(
        `Generating question for knowledgePoint: ${knowledgePointId} (attempt ${attempt})`,
      );

      // Get knowledge point
      const knowledgePoint = await this.prisma.knowledgePoint.findUnique({
        where: { id: knowledgePointId },
        include: {
          topic: {
            include: { lesson: true },
          },
          subtopic: {
            select: { name: true },
          },
        },
      });

      if (!knowledgePoint) {
        throw new NotFoundException(
          `KnowledgePoint ${knowledgePointId} not found`,
        );
      }

      const statement = knowledgePoint.fact;
      if (!statement || statement.trim().length === 0) {
        throw new Error(`KnowledgePoint ${knowledgePointId} has no statement`);
      }

      // Use AI Router with optional provider override and context IDs
      const response = await this.aiRouter.runTask(
        AITaskType.QUESTION_GENERATION,
        {
          statement,
          lesson: knowledgePoint.topic?.lesson?.name || undefined,
          topic: knowledgePoint.topic?.name || undefined,
          attempt,
          knowledgePointId: knowledgePointId,
          topicId: knowledgePoint.topicId || undefined,
          subtopicId: knowledgePoint.subtopicId || undefined,
        },
        providerOverride,
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

      const generationResponse = JSON.parse(
        jsonContent,
      ) as QuestionGenerationResponse;

      // Validate response
      if (!generationResponse.question || !generationResponse.options) {
        throw new Error('Invalid question generation response');
      }

      // Validate options
      const requiredOptions = ['A', 'B', 'C', 'D', 'E'];
      for (const option of requiredOptions) {
        if (
          !generationResponse.options[
            option as keyof typeof generationResponse.options
          ]
        ) {
          throw new Error(`Missing option ${option}`);
        }
      }

      // Validate correctAnswer
      if (!requiredOptions.includes(generationResponse.correctAnswer)) {
        throw new Error(
          `Invalid correctAnswer: ${generationResponse.correctAnswer}`,
        );
      }

      return {
        question: generationResponse.question.trim(),
        options: generationResponse.options,
        correctAnswer: generationResponse.correctAnswer,
        explanation: generationResponse.explanation?.trim() || '',
        scenarioType: generationResponse.scenarioType || 'Direct fact',
        difficulty: generationResponse.difficulty || 'MEDIUM',
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate question for knowledgePoint ${knowledgePointId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Generate question with similarity checking and regeneration
   */
  async generateQuestionWithSimilarityCheck(
    knowledgePointId: string,
    providerOverride?: AIProviderType,
  ): Promise<{
    question: GeneratedQuestionData;
    similarQuestionIds: string[];
  }> {
    let attempt = 1;
    let question: GeneratedQuestionData | null = null;
    let bestSimilarityResult: {
      isSimilar: boolean;
      maxSimilarity: number;
      similarQuestionIds: string[];
    } | null = null;

    while (attempt <= this.maxRegenerationAttempts) {
      try {
        // Generate question with provider override
        question = await this.generateQuestion(
          knowledgePointId,
          attempt,
          providerOverride,
        );

        // Check similarity
        const similarityResult = await this.checkSimilarity(question.question);

        if (!similarityResult.isSimilar) {
          this.logger.log(
            `Question generated successfully for knowledgePoint: ${knowledgePointId} (similarity: ${similarityResult.maxSimilarity.toFixed(3)})`,
          );
          return {
            question,
            similarQuestionIds: similarityResult.similarQuestionIds,
          };
        }

        // Track the best (lowest similarity) result
        if (
          !bestSimilarityResult ||
          similarityResult.maxSimilarity < bestSimilarityResult.maxSimilarity
        ) {
          bestSimilarityResult = similarityResult;
        }

        this.logger.warn(
          `Generated question is too similar (${similarityResult.maxSimilarity.toFixed(3)}) to existing questions. Regenerating... (attempt ${attempt}/${this.maxRegenerationAttempts})`,
        );

        attempt++;
      } catch (error) {
        this.logger.error(
          `Failed to generate question on attempt ${attempt}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        attempt++;
      }
    }

    // If we exhausted all attempts, return the last generated question
    if (question) {
      this.logger.warn(
        `Max regeneration attempts reached for knowledgePoint: ${knowledgePointId}. Using last generated question despite similarity.`,
      );
      return {
        question,
        similarQuestionIds: bestSimilarityResult?.similarQuestionIds || [],
      };
    }

    throw new Error(
      `Failed to generate question after ${this.maxRegenerationAttempts} attempts`,
    );
  }

  /**
   * Save question to database
   */
  async saveQuestion(
    knowledgePointId: string,
    questionData: GeneratedQuestionData,
    similarQuestionIds: string[] = [],
  ): Promise<string> {
    try {
      this.logger.log(
        `Saving question for knowledgePoint: ${knowledgePointId}`,
      );

      // Verify knowledge point exists
      const knowledgePoint = await this.prisma.knowledgePoint.findUnique({
        where: { id: knowledgePointId },
      });

      if (!knowledgePoint) {
        throw new NotFoundException(
          `KnowledgePoint ${knowledgePointId} not found`,
        );
      }

      // Create QuestionCard
      const questionCard = await this.prisma.questionCard.create({
        data: {
          sourceType: 'AI_GENERATION',
          question: questionData.question,
          options: questionData.options,
          correctAnswer: questionData.correctAnswer,
          explanation: questionData.explanation || null,
          scenarioType: questionData.scenarioType || null,
          similarityChecked: true,
          similarQuestionIds,
          approvalStatus: 'PENDING',
          lessonId: knowledgePoint.lessonId,
        },
      });

      // Create QuestionKnowledgePoint relation
      await this.prisma.questionKnowledgePoint.create({
        data: {
          questionCardId: questionCard.id,
          knowledgePointId,
          relationshipType: 'MEASURED',
        },
      });

      this.logger.log(
        `Question saved successfully: ${questionCard.id} for knowledgePoint: ${knowledgePointId}`,
      );

      return questionCard.id;
    } catch (error) {
      this.logger.error(
        `Failed to save question for knowledgePoint ${knowledgePointId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Check if knowledge point has a generated question
   */
  async hasQuestion(knowledgePointId: string): Promise<boolean> {
    const count = await this.prisma.questionKnowledgePoint.count({
      where: {
        knowledgePointId,
        relationshipType: 'MEASURED',
      },
    });
    return count > 0;
  }

  /**
   * Generate ERROR_BASED questions from user weaknesses
   * Analyzes UserWeakness records and generates targeted practice questions
   * @param userId - User ID to analyze weaknesses for
   * @param weaknessThreshold - Minimum weakness score (0-1) to trigger generation (default: 0.7)
   * @param limit - Maximum number of questions to generate (default: 5)
   * @param providerOverride - Optional AI provider override
   * @returns Array of generated QuestionCard IDs
   */
  async generateFromUserWeakness(
    userId: string,
    weaknessThreshold = 0.7,
    limit = 5,
    providerOverride?: AIProviderType,
  ): Promise<string[]> {
    try {
      this.logger.log(
        `Generating ERROR_BASED questions for user ${userId} (threshold: ${weaknessThreshold}, limit: ${limit})`,
      );

      // Step 1: Find weak knowledge points
      const weaknesses = await this.prisma.userWeakness.findMany({
        where: {
          userId,
          weaknessScore: { gte: weaknessThreshold },
          totalAttempts: { gte: 3 }, // Minimum attempts to ensure statistical significance
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
          weaknessScore: 'desc', // Prioritize worst weaknesses
        },
        take: limit,
      });

      if (weaknesses.length === 0) {
        this.logger.log(
          `No weaknesses found for user ${userId} above threshold`,
        );
        return [];
      }

      this.logger.log(
        `Found ${weaknesses.length} weak knowledge points for user ${userId}`,
      );

      const generatedQuestionIds: string[] = [];

      // Step 2: Generate targeted question for each weakness
      for (const weakness of weaknesses) {
        const knowledgePoint = weakness.knowledgePoint;

        this.logger.log(
          `Generating ERROR_BASED question for weak KnowledgePoint: ${knowledgePoint.id} (score: ${weakness.weaknessScore})`,
        );

        // Step 3: Get common mistakes context
        const recentMistakes = await this.prisma.userAnswer.findMany({
          where: {
            userId,
            isCorrect: false,
            questionCard: {
              questionKnowledgePoints: {
                some: {
                  knowledgePointId: knowledgePoint.id,
                },
              },
            },
          },
          include: {
            questionCard: {
              select: {
                question: true,
                correctAnswer: true,
                options: true,
              },
            },
          },
          orderBy: {
            answeredAt: 'desc',
          },
          take: 3, // Last 3 mistakes for context
        });

        // Step 4: Build enhanced prompt with mistake patterns
        const mistakeContext =
          recentMistakes.length > 0
            ? `\n\nThe student has recently made mistakes on similar questions. Common error pattern: selecting incorrect options when the key knowledge point is: "${knowledgePoint.fact}". Generate a question that reinforces the correct reasoning.`
            : '';

        const enhancedPrompt = `Generate a medical exam question (ERROR_BASED) that tests this weak knowledge point:

**Knowledge Point:** ${knowledgePoint.fact}

**Context:**
- Lesson: ${knowledgePoint.lesson.name}
${knowledgePoint.topic ? `- Topic: ${knowledgePoint.topic.name}` : ''}
${knowledgePoint.subtopic ? `- Subtopic: ${knowledgePoint.subtopic.name}` : ''}
- User weakness score: ${weakness.weaknessScore.toFixed(2)} (${weakness.incorrectCount} incorrect / ${weakness.totalAttempts} total)
${mistakeContext}

**Requirements:**
1. Create a NEW question scenario (not a duplicate)
2. Make the correct answer CLEARLY dependent on understanding the knowledge point
3. Include 5 options (A-E) with plausible distractors
4. Provide detailed explanation focusing on WHY the student likely got this wrong
5. Difficulty: MEDIUM (must be solvable but challenging)
6. Use realistic clinical scenario if applicable

**CRITICAL:** This is a remediation question. The student has struggled with this concept. Make it educational and clear.`;

        // Step 5: Generate question with similarity checking
        let questionData: GeneratedQuestionData | null = null;
        let attempts = 0;

        while (attempts < this.maxRegenerationAttempts && !questionData) {
          attempts++;

          try {
            const rawResponse = await this.aiRouter.runTask(
              AITaskType.QUESTION_GENERATION,
              {
                prompt: enhancedPrompt,
                knowledgePointId: knowledgePoint.id,
              },
              providerOverride,
            );

            // Extract JSON from response (same pattern as generateQuestion)
            let jsonContent = rawResponse;
            if (rawResponse.includes('```json')) {
              const jsonStart = rawResponse.indexOf('```json') + 7;
              const jsonEnd = rawResponse.indexOf('```', jsonStart);
              jsonContent = rawResponse.substring(jsonStart, jsonEnd).trim();
            } else if (rawResponse.includes('```')) {
              const jsonStart = rawResponse.indexOf('```') + 3;
              const jsonEnd = rawResponse.indexOf('```', jsonStart);
              jsonContent = rawResponse.substring(jsonStart, jsonEnd).trim();
            }

            const parsed = JSON.parse(jsonContent) as GeneratedQuestionData;

            // Similarity check
            const questionText = parsed.question;
            const embedding = await this.computeEmbedding(
              questionText,
              providerOverride,
            );

            const existingQuestions = await this.prisma.questionCard.findMany({
              where: {
                lessonId: knowledgePoint.lessonId,
              },
              select: {
                id: true,
                question: true,
              },
            });

            let maxSimilarity = 0;
            const similarQuestionIds: string[] = [];

            for (const existing of existingQuestions) {
              // Compute embedding for existing question
              try {
                const existingEmbedding = await this.computeEmbedding(
                  existing.question,
                );
                const similarity = this.cosineSimilarity(
                  embedding,
                  existingEmbedding,
                );

                if (similarity > maxSimilarity) {
                  maxSimilarity = similarity;
                }

                if (similarity > this.similarityThreshold) {
                  similarQuestionIds.push(existing.id);
                }
              } catch (embeddingError) {
                this.logger.warn(
                  `Failed to compute embedding for existing question ${existing.id}`,
                );
              }
            }

            if (maxSimilarity > this.similarityThreshold) {
              this.logger.warn(
                `Generated question too similar (${maxSimilarity.toFixed(3)}) on attempt ${attempts}. Regenerating...`,
              );
              continue;
            }

            // Question is good, use it
            questionData = parsed;
            questionData.difficulty = 'MEDIUM'; // Force MEDIUM difficulty for remediation

            // Step 6: Save ERROR_BASED QuestionCard
            const questionCard = await this.prisma.questionCard.create({
              data: {
                sourceType: 'ERROR_BASED',
                question: questionData.question,
                options: questionData.options,
                correctAnswer: questionData.correctAnswer,
                explanation: questionData.explanation || null,
                mainExplanation: `Remediation for: ${knowledgePoint.fact}`,
                scenarioType: questionData.scenarioType || null,
                difficulty: 'MEDIUM',
                similarityChecked: true,
                similarQuestionIds,
                approvalStatus: 'PENDING', // Requires admin review
                lessonId: knowledgePoint.lessonId,
                topicId: knowledgePoint.topicId,
                subtopicId: knowledgePoint.subtopicId,
              },
            });

            // Step 7: Link to knowledge point
            await this.prisma.questionKnowledgePoint.create({
              data: {
                questionCardId: questionCard.id,
                knowledgePointId: knowledgePoint.id,
                relationshipType: 'MEASURED',
              },
            });

            generatedQuestionIds.push(questionCard.id);

            this.logger.log(
              `ERROR_BASED question created: ${questionCard.id} for KnowledgePoint: ${knowledgePoint.id} (attempts: ${attempts})`,
            );
          } catch (error) {
            this.logger.error(
              `Attempt ${attempts} failed for KnowledgePoint ${knowledgePoint.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );

            if (attempts >= this.maxRegenerationAttempts) {
              this.logger.error(
                `Max attempts reached for KnowledgePoint ${knowledgePoint.id}. Skipping.`,
              );
            }
          }
        }
      }

      this.logger.log(
        `Generated ${generatedQuestionIds.length} ERROR_BASED questions for user ${userId}`,
      );

      return generatedQuestionIds;
    } catch (error) {
      this.logger.error(
        `Failed to generate ERROR_BASED questions for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
