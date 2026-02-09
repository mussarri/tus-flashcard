/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface BacktrackingResult {
  shouldBacktrack: boolean;
  prerequisitePatterns: string[];
  reason: string;
}

interface TrapLoopDetection {
  isInTrapLoop: boolean;
  trapLoopCount: number;
  recommendedAction:
    | 'PREREQUISITE_REVIEW'
    | 'ALTERNATIVE_EXPLANATION'
    | 'CONTINUE';
}

@Injectable()
export class AdaptiveAlgorithmService {
  private readonly logger = new Logger(AdaptiveAlgorithmService.name);

  // Adaptive Learning Thresholds
  private readonly MASTERY_THRESHOLD = 0.6; // 60% mastery to avoid backtracking
  private readonly TRAP_LOOP_THRESHOLD = 3; // 3 consecutive failures = trap loop

  constructor(private prisma: PrismaService) {}

  /**
   * Update card progress based on user response
   * Uses status-based system (EASY/MEDIUM/HARD)
   */
  async updateCardProgress(
    userId: string,
    flashcardId: string,
    response: 'CORRECT' | 'INCORRECT' | 'FELL_FOR_TRAP',
  ): Promise<void> {
    const progress = await this.prisma.userFlashcardProgress.findUnique({
      where: { userId_flashcardId: { userId, flashcardId } },
      include: { flashcard: true },
    });

    if (!progress) {
      // Create initial progress record
      const status = response === 'CORRECT' ? 'EASY' : 'HARD';
      await this.prisma.userFlashcardProgress.create({
        data: {
          userId,
          flashcardId,
          status,
          lastReview: new Date(),
          totalReviews: 1,
          correctCount: response === 'CORRECT' ? 1 : 0,
          incorrectCount: response === 'CORRECT' ? 0 : 1,
          fellForTrap: response === 'FELL_FOR_TRAP',
          trapLoopCount: response === 'FELL_FOR_TRAP' ? 1 : 0,
          lastResponse: response,
        },
      });
      return;
    }

    // Update trap tracking
    const trapLoopCount =
      response === 'FELL_FOR_TRAP' ? progress.trapLoopCount + 1 : 0;
    const trapLoopActive = trapLoopCount >= this.TRAP_LOOP_THRESHOLD;

    // Determine status based on response
    let status: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM';
    if (response === 'CORRECT') {
      status = 'EASY';
    } else if (response === 'FELL_FOR_TRAP' || response === 'INCORRECT') {
      status = 'HARD';
    }

    await this.prisma.userFlashcardProgress.update({
      where: { id: progress.id },
      data: {
        status,
        lastReview: new Date(),
        totalReviews: progress.totalReviews + 1,
        correctCount:
          response === 'CORRECT'
            ? progress.correctCount + 1
            : progress.correctCount,
        incorrectCount:
          response === 'CORRECT'
            ? progress.incorrectCount
            : progress.incorrectCount + 1,
        fellForTrap: response === 'FELL_FOR_TRAP',
        trapLoopActive,
        trapLoopCount,
        lastResponse: response,
      },
    });

    // Update pattern mastery if card has exam pattern
    if (progress.flashcard.examPattern) {
      await this.updatePatternMastery(userId, progress.flashcard.examPattern);
    }
  }

  /**
   * Update pattern mastery tracking
   * Calculates mastery score and triggers backtracking if needed
   */
  async updatePatternMastery(
    userId: string,
    examPattern: string,
  ): Promise<void> {
    // Get all cards for this pattern
    const patternCards = await this.prisma.flashcard.findMany({
      where: { examPattern },
      include: {
        userProgress: {
          where: { userId },
        },
      },
    });

    if (patternCards.length === 0) return;

    // Calculate mastery metrics
    const cardsTotal = patternCards.length;
    let cardsMastered = 0;
    let totalCorrectRate = 0;

    for (const card of patternCards) {
      const progress = card.userProgress[0];
      if (progress && progress.status === 'EASY') {
        cardsMastered++;
      }

      if (progress && progress.totalReviews > 0) {
        totalCorrectRate += progress.correctCount / progress.totalReviews;
      }
    }

    const masteryScore = cardsTotal > 0 ? cardsMastered / cardsTotal : 0;
    const needsBacktrack = masteryScore < this.MASTERY_THRESHOLD;

    // Upsert pattern mastery record
    await this.prisma.patternMastery.upsert({
      where: { userId_examPattern: { userId, examPattern } },
      create: {
        userId,
        examPattern,
        masteryScore,
        cardsTotal,
        cardsMastered,
        needsBacktrack,
        prerequisitePatterns: needsBacktrack
          ? this.getPrerequisitePatterns(examPattern)
          : [],
        backtrackTriggeredAt: needsBacktrack ? new Date() : null,
      },
      update: {
        masteryScore,
        cardsTotal,
        cardsMastered,
        needsBacktrack,
        prerequisitePatterns: needsBacktrack
          ? this.getPrerequisitePatterns(examPattern)
          : [],
        backtrackTriggeredAt:
          needsBacktrack && masteryScore < this.MASTERY_THRESHOLD
            ? new Date()
            : undefined,
      },
    });
  }

  /**
   * Check if user should backtrack to prerequisite patterns
   */
  async checkBacktracking(
    userId: string,
    examPattern: string,
  ): Promise<BacktrackingResult> {
    const patternMastery = await this.prisma.patternMastery.findUnique({
      where: { userId_examPattern: { userId, examPattern } },
    });

    if (!patternMastery) {
      return {
        shouldBacktrack: false,
        prerequisitePatterns: [],
        reason: 'No mastery data available',
      };
    }

    if (patternMastery.masteryScore < this.MASTERY_THRESHOLD) {
      return {
        shouldBacktrack: true,
        prerequisitePatterns: patternMastery.prerequisitePatterns,
        reason: `Pattern mastery is ${(patternMastery.masteryScore * 100).toFixed(0)}%, below ${(this.MASTERY_THRESHOLD * 100).toFixed(0)}% threshold`,
      };
    }

    return {
      shouldBacktrack: false,
      prerequisitePatterns: [],
      reason: 'Pattern mastery sufficient',
    };
  }

  /**
   * Detect if user is stuck in a trap loop
   */
  async detectTrapLoop(
    userId: string,
    flashcardId: string,
  ): Promise<TrapLoopDetection> {
    const progress = await this.prisma.userFlashcardProgress.findUnique({
      where: { userId_flashcardId: { userId, flashcardId } },
      include: { flashcard: true },
    });

    if (!progress) {
      return {
        isInTrapLoop: false,
        trapLoopCount: 0,
        recommendedAction: 'CONTINUE',
      };
    }

    if (
      progress.trapLoopActive &&
      progress.trapLoopCount >= this.TRAP_LOOP_THRESHOLD
    ) {
      // Check if prerequisite cards exist
      const hasPrerequisites =
        progress.flashcard.prerequisiteCardIds &&
        progress.flashcard.prerequisiteCardIds.length > 0;

      return {
        isInTrapLoop: true,
        trapLoopCount: progress.trapLoopCount,
        recommendedAction: hasPrerequisites
          ? 'PREREQUISITE_REVIEW'
          : 'ALTERNATIVE_EXPLANATION',
      };
    }

    return {
      isInTrapLoop: false,
      trapLoopCount: progress.trapLoopCount,
      recommendedAction: 'CONTINUE',
    };
  }

  /**
   * Get cards due for review for a user (HARD + MEDIUM status)
   */
  async getDueCards(userId: string, limit: number = 20): Promise<string[]> {
    const dueProgress = await this.prisma.userFlashcardProgress.findMany({
      where: {
        userId,
        status: { in: ['HARD', 'MEDIUM'] },
      },
      orderBy: { lastReview: 'asc' },
      take: limit,
      include: { flashcard: true },
    });

    // Prioritize trap loop cards (need alternative explanation)
    const trapLoopCards = dueProgress
      .filter((p) => p.trapLoopActive)
      .map((p) => p.flashcardId);

    const regularCards = dueProgress
      .filter((p) => !p.trapLoopActive)
      .map((p) => p.flashcardId);

    return [...trapLoopCards, ...regularCards].slice(0, limit);
  }

  /**
   * Get prerequisite cards for review (backtracking)
   */
  async getPrerequisiteCards(
    userId: string,
    flashcardId: string,
  ): Promise<string[]> {
    const flashcard = await this.prisma.flashcard.findUnique({
      where: { id: flashcardId },
    });

    if (
      !flashcard ||
      !flashcard.prerequisiteCardIds ||
      flashcard.prerequisiteCardIds.length === 0
    ) {
      return [];
    }

    // Get prerequisite cards that user hasn't mastered yet
    const prerequisites = await this.prisma.flashcard.findMany({
      where: {
        id: { in: flashcard.prerequisiteCardIds },
      },
      include: {
        userProgress: {
          where: { userId },
        },
      },
    });

    return prerequisites
      .filter((card) => {
        const progress = card.userProgress[0];
        return !progress || progress.status !== 'EASY';
      })
      .map((card) => card.id);
  }

  /**
   * Define prerequisite patterns for each exam pattern
   * This is the knowledge graph for adaptive backtracking
   */
  private getPrerequisitePatterns(examPattern: string): string[] {
    const prerequisiteMap: Record<string, string[]> = {
      'except-trap': ['functional-anatomy', 'relations-borders'],
      'clinical-vignette': ['functional-anatomy', 'lesion-anatomy'],
      'lesion-anatomy': ['functional-anatomy'],
      'embryologic-origin': ['functional-anatomy'],
      'high-yield-distinction': ['functional-anatomy', 'relations-borders'],
      'topographic-map': ['structure-id', 'relations-borders'],
    };

    return prerequisiteMap[examPattern] || [];
  }

  /**
   * Get learning analytics for a user
   */
  async getUserAnalytics(userId: string): Promise<{
    totalCards: number;
    masteredCards: number;
    dueCards: number;
    trapLoopCards: number;
    patternsMastered: number;
    patternsNeedBacktrack: number;
    overallMasteryScore: number;
  }> {
    const allProgress = await this.prisma.userFlashcardProgress.findMany({
      where: { userId },
    });

    const totalCards = allProgress.length;
    const masteredCards = allProgress.filter((p) => p.status === 'EASY')
      .length;

    const dueCards = allProgress.filter((p) =>
      ['HARD', 'MEDIUM'].includes(p.status),
    ).length;
    const trapLoopCards = allProgress.filter((p) => p.trapLoopActive).length;

    const patternMastery = await this.prisma.patternMastery.findMany({
      where: { userId },
    });

    const patternsMastered = patternMastery.filter(
      (p) => p.masteryScore >= this.MASTERY_THRESHOLD,
    ).length;
    const patternsNeedBacktrack = patternMastery.filter(
      (p) => p.needsBacktrack,
    ).length;

    const overallMasteryScore = totalCards > 0 ? masteredCards / totalCards : 0;

    return {
      totalCards,
      masteredCards,
      dueCards,
      trapLoopCards,
      patternsMastered,
      patternsNeedBacktrack,
      overallMasteryScore,
    };
  }
}
