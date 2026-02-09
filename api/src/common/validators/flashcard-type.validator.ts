/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CardType } from '@prisma/client';

const logger = new Logger('FlashcardTypeValidator');

@Injectable()
export class FlashcardTypeValidator {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate that a flashcard type is allowed for a given lesson
   */
  async validateFlashcardTypeForLesson(
    lesson: string | null | undefined,
    cardType: CardType,
  ): Promise<void> {
    if (!lesson) {
      throw new BadRequestException(
        'Flashcard must belong to a lesson. KnowledgePoint.category (lesson) is required.',
      );
    }

    // Check if this lesson-cardType combination is allowed
    const mapping = await this.prisma.lessonFlashcardType.findUnique({
      where: {
        lesson_cardType: {
          lesson,
          cardType,
        },
      },
    });

    if (!mapping) {
      logger.error(
        `Flashcard type ${cardType} not allowed for lesson: ${lesson}`,
      );
      throw new BadRequestException(
        `Flashcard type not allowed for this lesson. Lesson: ${lesson}, CardType: ${cardType}`,
      );
    }
  }

  /**
   * Get allowed flashcard types for a lesson
   */
  async getAllowedTypesForLesson(lesson: string): Promise<CardType[]> {
    const mappings = await this.prisma.lessonFlashcardType.findMany({
      where: { lesson },
      select: { cardType: true },
    });

    return mappings.map((m) => m.cardType);
  }

  /**
   * Initialize default lesson-flashcard type mappings
   * This should be called during system initialization
   */
  async initializeDefaultMappings(): Promise<void> {
    const defaultLessons = [
      'Dahiliye',
      'Pediatri',
      'Nöroloji',
      'Farmakoloji',
      'Patoloji',
      'Biyokimya',
      'Fizyoloji',
      'Mikrobiyoloji',
      'Kadın-Doğum',
      'Cerrahi',
      'Psikiyatri',
    ];

    const allCardTypes: CardType[] = [
      'SPOT',
      'TRAP',
      'CLINICAL_TIP',
      'COMPARISON',
    ];

    for (const lesson of defaultLessons) {
      for (const cardType of allCardTypes) {
        try {
          await this.prisma.lessonFlashcardType.upsert({
            where: {
              lesson_cardType: {
                lesson,
                cardType,
              },
            },
            create: {
              lesson,
              cardType,
            },
            update: {}, // No update needed if exists
          });
        } catch (error) {
          // Ignore duplicate key errors
          logger.debug(`Mapping already exists: ${lesson} -> ${cardType}`);
        }
      }
    }

    logger.log('Default lesson-flashcard type mappings initialized');
  }
}
