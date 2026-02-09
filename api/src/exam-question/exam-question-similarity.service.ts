/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIRouterService } from '../ai/ai-router.service';
import { AITaskType } from '../ai/types';

export interface GeneratedQuestionInput {
  questionText: string;
  spotRule?: string;
  topic?: string;
  subtopic?: string;
  optionAnalysis?: Array<{ wouldBeCorrectIf: string }>;
}

export interface ExamQuestionInput {
  questionText: string;
  spotRule?: string;
  topic?: string;
  subtopic?: string;
  optionAnalysis?: Array<{ wouldBeCorrectIf: string }>;
}

export interface SimilarityResult {
  similarityScore: number;
  similarityLevel:
    | 'IDENTICAL'
    | 'VERY_SIMILAR'
    | 'SAME_KNOWLEDGE'
    | 'DIFFERENT';
  primaryKnowledgeSimilarity: number;
  topicSimilarity: number;
  trapSimilarity: number;
  decision: 'BLOCK' | 'ADMIN_REVIEW' | 'ALLOW';
  adminMessage: string;
}

@Injectable()
export class ExamQuestionSimilarityService {
  private readonly logger = new Logger(ExamQuestionSimilarityService.name);

  // Weights for similarity calculation
  private readonly PRIMARY_WEIGHT = 0.6;
  private readonly TOPIC_WEIGHT = 0.25;
  private readonly TRAP_WEIGHT = 0.15;

  // Thresholds
  private readonly PRIMARY_MIN_THRESHOLD = 0.7;
  private readonly IDENTICAL_THRESHOLD = 0.9;
  private readonly VERY_SIMILAR_THRESHOLD = 0.8;
  private readonly SAME_KNOWLEDGE_THRESHOLD = 0.65;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AIRouterService))
    private readonly aiRouter: AIRouterService,
  ) {}

  /**
   * Compute embedding for a text
   */
  private async computeEmbedding(text: string): Promise<number[]> {
    try {
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
   * Check similarity between GeneratedQuestion and ExamQuestion
   */
  async checkSimilarity(
    generatedQuestion: GeneratedQuestionInput,
    examQuestion: ExamQuestionInput,
  ): Promise<SimilarityResult> {
    this.logger.log('Checking similarity between generated and exam question');

    try {
      // A) PRIMARY KNOWLEDGE EMBEDDING (spotRule)
      const primaryKnowledge1 =
        generatedQuestion.spotRule || generatedQuestion.questionText;
      const primaryKnowledge2 =
        examQuestion.spotRule || examQuestion.questionText;
      const primaryEmbedding1 = await this.computeEmbedding(primaryKnowledge1);
      const primaryEmbedding2 = await this.computeEmbedding(primaryKnowledge2);
      const primaryKnowledgeSimilarity = this.cosineSimilarity(
        primaryEmbedding1,
        primaryEmbedding2,
      );

      // IMPORTANT ANATOMY RULE: If primaryKnowledgeSimilarity < 0.70, cannot be similar
      if (primaryKnowledgeSimilarity < this.PRIMARY_MIN_THRESHOLD) {
        return {
          similarityScore: primaryKnowledgeSimilarity,
          similarityLevel: 'DIFFERENT',
          primaryKnowledgeSimilarity,
          topicSimilarity: 0,
          trapSimilarity: 0,
          decision: 'ALLOW',
          adminMessage:
            'No significant similarity with past TUS questions detected.',
        };
      }

      // B) TOPIC CONTEXT EMBEDDING (topic + subtopic)
      const topicContext1 = [
        generatedQuestion.topic,
        generatedQuestion.subtopic,
      ]
        .filter(Boolean)
        .join(' ');
      const topicContext2 = [examQuestion.topic, examQuestion.subtopic]
        .filter(Boolean)
        .join(' ');

      let topicSimilarity = 0;
      if (topicContext1 && topicContext2) {
        const topicEmbedding1 = await this.computeEmbedding(topicContext1);
        const topicEmbedding2 = await this.computeEmbedding(topicContext2);
        topicSimilarity = this.cosineSimilarity(
          topicEmbedding1,
          topicEmbedding2,
        );
      }

      // C) TRAP PATTERN EMBEDDING (optionAnalysis)
      let trapSimilarity = 0;
      if (
        generatedQuestion.optionAnalysis &&
        generatedQuestion.optionAnalysis.length > 0 &&
        examQuestion.optionAnalysis &&
        examQuestion.optionAnalysis.length > 0
      ) {
        const trapText1 = generatedQuestion.optionAnalysis
          .map((opt) => opt.wouldBeCorrectIf)
          .join(' ');
        const trapText2 = examQuestion.optionAnalysis
          .map((opt) => opt.wouldBeCorrectIf)
          .join(' ');

        const trapEmbedding1 = await this.computeEmbedding(trapText1);
        const trapEmbedding2 = await this.computeEmbedding(trapText2);
        trapSimilarity = this.cosineSimilarity(trapEmbedding1, trapEmbedding2);
      }

      // Calculate weighted final score
      const finalScore =
        this.PRIMARY_WEIGHT * primaryKnowledgeSimilarity +
        this.TOPIC_WEIGHT * topicSimilarity +
        this.TRAP_WEIGHT * trapSimilarity;

      // Determine similarity level and decision
      let similarityLevel:
        | 'IDENTICAL'
        | 'VERY_SIMILAR'
        | 'SAME_KNOWLEDGE'
        | 'DIFFERENT';
      let decision: 'BLOCK' | 'ADMIN_REVIEW' | 'ALLOW';
      let adminMessage: string;

      if (finalScore >= this.IDENTICAL_THRESHOLD) {
        similarityLevel = 'IDENTICAL';
        decision = 'BLOCK';
        adminMessage =
          'This generated question is almost identical to a past TUS question and should not be published.';
      } else if (finalScore >= this.VERY_SIMILAR_THRESHOLD) {
        similarityLevel = 'VERY_SIMILAR';
        decision = 'ADMIN_REVIEW';
        adminMessage =
          'This question is very similar to a past TUS question. Please review before approval.';
      } else if (finalScore >= this.SAME_KNOWLEDGE_THRESHOLD) {
        similarityLevel = 'SAME_KNOWLEDGE';
        decision = 'ALLOW';
        adminMessage =
          'This question measures the same anatomical knowledge as a past TUS question but from a different angle.';
      } else {
        similarityLevel = 'DIFFERENT';
        decision = 'ALLOW';
        adminMessage =
          'No significant similarity with past TUS questions detected.';
      }

      return {
        similarityScore: finalScore,
        similarityLevel,
        primaryKnowledgeSimilarity,
        topicSimilarity,
        trapSimilarity,
        decision,
        adminMessage,
      };
    } catch (error) {
      this.logger.error(
        `Similarity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Check similarity against all exam questions in database
   */
  async checkSimilarityAgainstAll(
    generatedQuestion: GeneratedQuestionInput,
    lesson?: string,
  ): Promise<SimilarityResult> {
    this.logger.log('Checking similarity against all exam questions');

    // Get all exam questions (optionally filtered by lesson)
    const where: any = {
      analysisStatus: 'ANALYZED',
    };

    if (lesson) {
      where.lesson = lesson;
    }

    const examQuestions = await this.prisma.examQuestion.findMany({
      where,
      select: {
        id: true,
        question: true,
        lesson: true,
        topic: true,
        subtopic: true,
        traps: true,
      },
    });

    if (examQuestions.length === 0) {
      return {
        similarityScore: 0,
        similarityLevel: 'DIFFERENT',
        primaryKnowledgeSimilarity: 0,
        topicSimilarity: 0,
        trapSimilarity: 0,
        decision: 'ALLOW',
        adminMessage: 'No past TUS questions found for comparison.',
      };
    }

    // Check similarity against each exam question
    let maxSimilarity: SimilarityResult | null = null;

    for (const examQuestion of examQuestions) {
      // Parse traps (could be array or object for anatomy questions)
      let optionAnalysis: Array<{ wouldBeCorrectIf: string }> | undefined;
      let spotRule: string | undefined;

      if (examQuestion.traps) {
        const traps = examQuestion.traps as any;
        if (Array.isArray(traps)) {
          // Old format: string array (general questions)
          // No optionAnalysis or spotRule available, use question text
          spotRule = examQuestion.question;
        } else if (typeof traps === 'object' && traps !== null) {
          // New format: anatomy-specific structure
          spotRule = traps.spotRule || examQuestion.question;
          optionAnalysis = traps.optionAnalysis;
        } else {
          // Fallback: use question text
          spotRule = examQuestion.question;
        }
      } else {
        // No traps data, use question text
        spotRule = examQuestion.question;
      }

      const examQuestionInput: ExamQuestionInput = {
        questionText: examQuestion.question,
        spotRule: spotRule,
        topic: examQuestion.topic?.name || undefined,
        subtopic: examQuestion.subtopic?.name || undefined,
        optionAnalysis: optionAnalysis,
      };

      const similarity = await this.checkSimilarity(
        generatedQuestion,
        examQuestionInput,
      );

      // Keep track of maximum similarity
      if (
        !maxSimilarity ||
        similarity.similarityScore > maxSimilarity.similarityScore
      ) {
        maxSimilarity = similarity;
      }

      // If we found an IDENTICAL match, we can stop early
      if (similarity.similarityLevel === 'IDENTICAL') {
        break;
      }
    }

    return maxSimilarity!;
  }
}
