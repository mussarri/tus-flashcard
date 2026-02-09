/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CardType } from '@prisma/client';
import { FlashcardTypeValidator } from '../common/validators/flashcard-type.validator';
import { AIRouterService } from '../ai/ai-router.service';
import * as crypto from 'crypto';
export interface GeneratedFlashcard {
  cardType: // CORE CARDS (Tier 1)
    | 'STRUCTURE_ID'
    | 'CONTENTS_OF_SPACE'
    | 'FUNCTIONAL_ANATOMY'
    // INTERMEDIATE CARDS (Tier 2)
    | 'RELATIONS_BORDERS'
    | 'LESION_ANATOMY'
    | 'EMBRYOLOGIC_ORIGIN'
    // ADVANCED CARDS (Tier 3)
    | 'CLINICAL_CORRELATION'
    | 'HIGH_YIELD_DISTINCTION'
    | 'EXCEPT_TRAP'
    | 'TOPOGRAPHIC_MAP'
    // LEGACY TYPES
    | 'SPOT'
    | 'TRAP'
    | 'CLINICAL_TIP'
    | 'COMPARISON';
  front: string;
  back: string;
  examPattern?: string;
  trapData?: any;
  prerequisiteCardIds?: string[];
  visualRequired?: boolean;
}

@Injectable()
export class FlashcardGenerationService {
  private readonly logger = new Logger(FlashcardGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly flashcardTypeValidator: FlashcardTypeValidator,
    private readonly aiRouter: AIRouterService,
  ) {
    this.logger.log('Flashcard generation service initialized');
  }

  /**
   * Generate flashcards for a knowledge point (AI-based)
   * @param knowledgePointId - The knowledge point ID
   */
  async generateFlashcards(
    knowledgePointId: string,
  ): Promise<GeneratedFlashcard[]> {
    try {
      this.logger.log(
        `Generating flashcards for knowledgePoint: ${knowledgePointId}`,
      );

      // Get knowledge point
      const knowledgePoint = await this.prisma.knowledgePoint.findUnique({
        where: { id: knowledgePointId },
        include: {
          topic: { include: { lesson: true } },
          subtopic: true,
        },
      });

      if (!knowledgePoint) {
        throw new NotFoundException(
          `KnowledgePoint ${knowledgePointId} not found`,
        );
      }

      const statement = knowledgePoint.fact;
      if (!statement || statement.trim().length === 0) {
        this.logger.warn(`KnowledgePoint ${knowledgePointId} has no statement`);
        return [];
      }

      // Determine target card types based on exam pattern or default to core types
      console.log(knowledgePoint.examPattern);

      const targetTypes = this.getTargetCardTypes(knowledgePoint.examPattern);

      // Generate flashcards using AI
      const cards = await this.generateCardsWithAI(statement, targetTypes);

      const lesson = knowledgePoint.topic?.lesson?.name || undefined;

      // Validate flashcard types
      // const validatedFlashcards: GeneratedFlashcard[] = [];
      // for (const card of cards) {
      //   try {
      //     await this.flashcardTypeValidator.validateFlashcardTypeForLesson(
      //       lesson,
      //       card.cardType as CardType,
      //     );
      //     validatedFlashcards.push(card);
      //   } catch (error) {
      //     this.logger.warn(
      //       `Flashcard type ${card.cardType} not allowed for lesson ${lesson}, skipping`,
      //     );
      //   }
      // }

      return cards;
    } catch (error) {
      this.logger.error(
        `Failed to generate flashcards for knowledgePoint ${knowledgePointId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Generate flashcards using AI (anatomy-flashcard.prompt.ts)
   * @param fact - Knowledge point fact/statement
   * @param targetTypes - Array of card types to generate
   * @returns Array of generated flashcards
   */
  private async generateCardsWithAI(
    fact: string,
    targetTypes: CardType[],
  ): Promise<GeneratedFlashcard[]> {
    try {
      this.logger.log(
        `Generating flashcards with AI for fact: ${fact.substring(0, 50)}... (targetTypes: ${targetTypes.join(', ')})`,
      );

      // Call AI Router with anatomy flashcard prompt
      const result = await this.aiRouter.runAnatomyFlashcardTask({
        statement: fact,
        targetTypes: targetTypes,
      });

      // Parse AI response
      const aiResponse = JSON.parse(result.content) as Record<
        string,
        { q: string; a: string }
      >;

      // Convert AI response to GeneratedFlashcard format
      const flashcards: GeneratedFlashcard[] = [];

      for (const [cardType, cardData] of Object.entries(aiResponse)) {
        if (
          cardData &&
          typeof cardData === 'object' &&
          'q' in cardData &&
          'a' in cardData
        ) {
          const data = cardData as { q: string; a: string };

          // Map card type and determine visual requirements
          const visualRequired = this.isVisualRequired(cardType as CardType);
          console.log(visualRequired);

          flashcards.push({
            cardType: cardType as any,
            front: data.q,
            back: data.a,
            visualRequired,
          });
        }
      }

      this.logger.log(
        `AI generated ${flashcards.length} flashcards successfully`,
      );
      return flashcards;
    } catch (error) {
      this.logger.error(
        `Failed to generate flashcards with AI: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Helper: Determine if card type requires visual
   */
  private isVisualRequired(cardType: CardType): boolean {
    const visualRequiredTypes: CardType[] = ['STRUCTURE_ID', 'TOPOGRAPHIC_MAP'];
    return visualRequiredTypes.includes(cardType);
  }

  /**
   * Helper: Get target card types based on exam pattern
   */
  private getTargetCardTypes(examPattern?: string | null): CardType[] {
    // Default core types for all knowledge points
    const coreTypes: CardType[] = [
      'STRUCTURE_ID',
      'FUNCTIONAL_ANATOMY',
      'CONTENTS_OF_SPACE',
    ];

    // Pattern-based card type mapping
    const patternMap: Record<string, CardType[]> = {
      FORAMEN_CONTENTS: ['CONTENTS_OF_SPACE', 'STRUCTURE_ID'],
      MUSCLE_INNERVATION: ['FUNCTIONAL_ANATOMY', 'LESION_ANATOMY'],
      LANDMARK_RELATION: [
        'STRUCTURE_ID',
        'RELATIONS_BORDERS',
        'TOPOGRAPHIC_MAP',
      ],
      CLINICAL_CORRELATION: ['CLINICAL_CORRELATION', 'LESION_ANATOMY'],
      EMBRYOLOGIC: ['EMBRYOLOGIC_ORIGIN', 'STRUCTURE_ID'],
    };

    if (examPattern && patternMap[examPattern]) {
      return patternMap[examPattern];
    }

    return coreTypes;
  }

  /**
   * Save flashcards to database
   */
  async saveFlashcards(
    knowledgePointId: string,
    flashcards: GeneratedFlashcard[],
  ): Promise<number> {
    try {
      this.logger.log(
        `Saving ${flashcards.length} flashcards for knowledgePoint: ${knowledgePointId}`,
      );

      // Verify knowledge point exists
      const knowledgePoint = await this.prisma.knowledgePoint.findUnique({
        where: { id: knowledgePointId },
        include: {
          topic: { include: { lesson: true } },
          subtopic: true,
        },
      });

      if (!knowledgePoint) {
        throw new NotFoundException(
          `KnowledgePoint ${knowledgePointId} not found`,
        );
      }

      let savedCount = 0;

      const lesson = knowledgePoint.topic?.lesson?.name || undefined; // category maps to lesson

      for (const card of flashcards) {
        try {
          // Final validation before saving
          // await this.flashcardTypeValidator.validateFlashcardTypeForLesson(
          //   lesson,
          //   card.cardType,
          // );

          await this.prisma.flashcard.create({
            data: {
              knowledgePointId,
              cardType: card.cardType,
              front: card.front,
              back: card.back,
              lessonId: knowledgePoint.topic?.lesson?.id || undefined, // Store lesson for traceability
              topicId: knowledgePoint.topicId || undefined,
              subtopicId: knowledgePoint.subtopicId || undefined,
              priority: knowledgePoint.priority || 0,
              difficulty: 'MEDIUM',
              approvalStatus: 'PENDING',
              visualStatus: card.visualRequired ? 'REQUIRED' : 'NOT_REQUIRED',
              useVisual: card.visualRequired || false,
            },
          });
          savedCount++;
          this.logger.debug(
            `Created flashcard: ${card.cardType} for knowledgePoint: ${knowledgePointId}, lessonId: ${knowledgePoint.topic?.lesson?.id || undefined}, visualRequired: ${card.visualRequired}`,
          );
        } catch (error) {
          // Reject invalid flashcards - don't silently skip
          if (error instanceof BadRequestException) {
            throw error; // Re-throw validation errors
          }
          // Log error but continue with other flashcards for other errors
          this.logger.error(
            `Failed to save flashcard ${card.cardType} for knowledgePoint ${knowledgePointId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      this.logger.log(
        `Saved ${savedCount}/${flashcards.length} flashcards for knowledgePoint: ${knowledgePointId}`,
      );

      return savedCount;
    } catch (error) {
      this.logger.error(
        `Failed to save flashcards for knowledgePoint ${knowledgePointId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Check if knowledge point has flashcards
   */
  async hasFlashcards(knowledgePointId: string): Promise<boolean> {
    const count = await this.prisma.flashcard.count({
      where: { knowledgePointId },
    });
    return count > 0;
  }

  /**
   * Generate advanced flashcards from ExamQuestion (EXCEPT_TRAP, CLINICAL_CORRELATION)
   */
  async generateFromExamQuestion(
    examQuestionId: string,
  ): Promise<GeneratedFlashcard[]> {
    try {
      this.logger.log(
        `Generating advanced flashcards from exam question: ${examQuestionId}`,
      );

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

      const flashcards: GeneratedFlashcard[] = [];

      // Generate EXCEPT_TRAP card if question contains EXCEPT pattern
      if (this.hasExceptPattern(examQuestion.question)) {
        const options = examQuestion.options as any;
        const correctAnswer = examQuestion.correctAnswer;
        const correctOption = options[correctAnswer];

        // Extract topic from question
        const topicName =
          examQuestion.topic?.name || examQuestion.lesson?.name || 'the topic';

        // Create front text
        const front = examQuestion.question;

        // Create back text with correct answer explanation
        const otherOptions = Object.keys(options as Record<string, string>)
          .filter((key) => key !== correctAnswer)
          .map((key) => `${key}) ${options[key]}`);

        const back =
          `Correct Answer: ${correctAnswer}) ${correctOption}\n\n` +
          `This is the EXCEPT answer (the FALSE statement).\n\n` +
          `The other options are TRUE:\n${otherOptions.join('\n')}`;

        flashcards.push({
          cardType: 'EXCEPT_TRAP',
          front,
          back,
          examPattern: 'except-trap',
          trapData: {
            correctAnswer: examQuestion.correctAnswer,
            options: examQuestion.options,
            traps: examQuestion.traps,
          },
        });
      }

      // Generate CLINICAL_CORRELATION card if question has clinical vignette
      if (this.hasClinicalContext(examQuestion.question)) {
        const options = examQuestion.options as any;
        const correctAnswer = examQuestion.correctAnswer;
        const correctOption = options[correctAnswer];

        // Create clinical vignette front
        const front = examQuestion.question;

        // Create back with answer and explanation
        const back =
          `Answer: ${correctAnswer}) ${correctOption}\n\n` +
          `Explanation: ${examQuestion.explanation || 'Clinical correlation based on exam question.'}\n\n` +
          `Topic: ${examQuestion.topic?.name || examQuestion.lesson?.name || 'Anatomy'}`;

        flashcards.push({
          cardType: 'CLINICAL_CORRELATION',
          front,
          back,
          examPattern: 'clinical-vignette',
        });
      }

      this.logger.log(
        `Generated ${flashcards.length} advanced flashcards from exam question: ${examQuestionId}`,
      );

      return flashcards;
    } catch (error) {
      this.logger.error(
        `Failed to generate flashcards from exam question ${examQuestionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Save exam question flashcards to database
   */
  async saveExamQuestionFlashcards(
    examQuestionId: string,
    flashcards: GeneratedFlashcard[],
  ): Promise<number> {
    try {
      this.logger.log(
        `Saving ${flashcards.length} exam flashcards for question: ${examQuestionId}`,
      );

      const examQuestion = await this.prisma.examQuestion.findUnique({
        where: { id: examQuestionId },
        include: { lesson: true, topic: true, subtopic: true },
      });

      if (!examQuestion) {
        throw new NotFoundException(`ExamQuestion ${examQuestionId} not found`);
      }

      let savedCount = 0;

      for (const card of flashcards) {
        try {
          // Generate unique key for deduplication
          const uniqueKey = this.generateUniqueKey(
            card.cardType,
            examQuestion.lessonId,
            examQuestion?.topicId || '',
            card.front,
          );

          await this.prisma.flashcard.create({
            data: {
              examQuestionId,
              cardType: card.cardType as CardType,
              front: card.front,
              back: card.back,
              lessonId: examQuestion.lessonId,
              topicId: examQuestion?.topicId || '',
              subtopicId: examQuestion?.subtopicId || '',
              examPattern: card.examPattern,
              trapData: card.trapData,
              uniqueKey,
              visualStatus: card.visualRequired ? 'REQUIRED' : 'NOT_REQUIRED',
              useVisual: card.visualRequired || false,
              approvalStatus: 'PENDING',
            },
          });
          savedCount++;
        } catch (error) {
          this.logger.error(
            `Failed to save flashcard ${card.cardType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      this.logger.log(
        `Saved ${savedCount}/${flashcards.length} exam flashcards for question: ${examQuestionId}`,
      );

      return savedCount;
    } catch (error) {
      this.logger.error(
        `Failed to save exam flashcards for question ${examQuestionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private generateUniqueKey(
    cardType: string,
    lessonId: string,
    topicId: string,
    frontText: string,
  ): string {
    const normalized = frontText.toLowerCase().trim().replace(/\s+/g, ' ');
    const hash = crypto
      .createHash('sha256')
      .update(`${cardType}-${lessonId || ''}-${topicId || ''}-${normalized}`)
      .digest('hex');
    return hash.substring(0, 32);
  }

  private hasExceptPattern(question: string): boolean {
    return /except|not true|false|incorrect|hariç|dışında/i.test(question);
  }

  private hasClinicalContext(question: string): boolean {
    return /patient|hasta|presents|başvur|clinical|klinik|symptoms|semptom|diagnosis|tanı/i.test(
      question,
    );
  }
}
