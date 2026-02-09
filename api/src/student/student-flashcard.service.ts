/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import * as path from 'path';

interface SessionQueueItem {
  cardId: string;
  priority: number;
}

interface StudySession {
  id: string;
  userId: string;
  queue: SessionQueueItem[];
  completedCards: string[];
  createdAt: Date;
}

const activeSessions = new Map<string, StudySession>();

@Injectable()
export class StudentFlashcardService {
  private readonly logger = new Logger(StudentFlashcardService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // 1. SESSION MANAGEMENT
  // ============================================

  /**
   * Get daily overview of cards (due, learning, new) by lesson
   * Due = HARD + MEDIUM (cards needing review)
   * Learning = MEDIUM (cards in progress)
   * New = UNSEEN (cards never reviewed)
   */
  async getDailyOverview(userId: string) {
    try {
      this.logger.log(`Getting daily overview for user ${userId}`);

      // Get all lessons with published flashcards
      const lessons = await this.prisma.lesson.findMany({
        where: {
          flashcards: {
            some: {
              approvalStatus: 'APPROVED',
            },
          },
        },
        select: {
          id: true,
          name: true,
          displayName: true,
          topics: { select: { id: true, name: true, displayName: true } },
        },
      });

      this.logger.log(
        `Found ${lessons.length} lessons with approved flashcards`,
      );

      if (lessons.length === 0) {
        return {
          success: true,
          overview: {},
          message: 'No approved flashcards available yet.',
        };
      }

      const overview: Record<
        string,
        { due: number; learning: number; new: number; hard: number }
      > = {};

      for (const lesson of lessons) {
        // HARD cards (need urgent review)
        const hardCount = await this.prisma.userFlashcardProgress.count({
          where: {
            userId,
            flashcard: {
              lessonId: lesson.id,
              approvalStatus: 'APPROVED',
            },
            status: 'HARD',
          },
        });

        // Due cards (HARD + MEDIUM statuses)
        const dueCount = await this.prisma.userFlashcardProgress.count({
          where: {
            userId,
            flashcard: {
              lessonId: lesson.id,
              approvalStatus: 'APPROVED',
            },
            status: {
              in: ['HARD', 'MEDIUM'],
            },
          },
        });

        // Learning cards (MEDIUM status only)
        const learningCount = await this.prisma.userFlashcardProgress.count({
          where: {
            userId,
            flashcard: {
              lessonId: lesson.id,
              approvalStatus: 'APPROVED',
            },
            status: 'MEDIUM',
          },
        });

        // New cards (UNSEEN - no progress record)
        const totalCards = await this.prisma.flashcard.count({
          where: {
            lessonId: lesson.id,
            approvalStatus: 'APPROVED',
          },
        });

        const reviewedCards = await this.prisma.userFlashcardProgress.count({
          where: {
            userId,
            flashcard: {
              lessonId: lesson.id,
              approvalStatus: 'APPROVED',
            },
          },
        });

        const newCount = totalCards - reviewedCards;

        overview[lesson.name] = {
          due: dueCount,
          learning: learningCount,
          new: Math.max(0, newCount),
          hard: hardCount, // Add explicit HARD count
        };
      }

      return {
        success: true,
        overview,
        lessons,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get daily overview: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        'Failed to get daily overview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a new study session with status-based filtering
   */
  async createSession(params: {
    userId: string;
    lessonId?: string;
    topicId?: string;
    statuses: string[]; // Multiple status selection: UNSEEN, EASY, MEDIUM, HARD
    limit: number;
    enablePatternWeighting?: boolean; // Prioritize LANDMARK cards in anatomy lessons
  }) {
    try {
      const {
        userId,
        lessonId,
        topicId,
        statuses,
        limit,
        enablePatternWeighting = false,
      } = params;

      this.logger.log(
        `Creating session for user ${userId}, statuses: ${statuses.join(', ')}, lesson: ${lessonId || 'all'}, topic: ${topicId || 'all'}`,
      );

      // Validate statuses
      const validStatuses = ['UNSEEN', 'EASY', 'MEDIUM', 'HARD'];
      const invalidStatuses = statuses.filter(
        (s) => !validStatuses.includes(s),
      );
      if (invalidStatuses.length > 0) {
        throw new HttpException(
          `Invalid statuses: ${invalidStatuses.join(', ')}. Valid: ${validStatuses.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (statuses.length === 0) {
        throw new HttpException(
          'At least one status must be selected',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Check total available cards first
      const totalAvailableCards = await this.prisma.flashcard.count({
        where: {
          approvalStatus: 'APPROVED',
          ...(lessonId && { lessonId }),
          ...(topicId && { topicId }),
        },
      });

      this.logger.log(`Total approved cards available: ${totalAvailableCards}`);

      if (totalAvailableCards === 0) {
        throw new HttpException(
          `No approved flashcards found${lessonId ? ` for lesson ${lessonId}` : ''}${topicId ? ` and topic ${topicId}` : ''}. Please contact admin to approve cards.`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Build status-based query with OR conditions
      const statusConditions: Array<{ cardId: string; cardType: any }> = [];

      // Handle UNSEEN status (cards without progress records)
      if (statuses.includes('UNSEEN')) {
        // Get cards with no progress
        const unseenCards = await this.prisma.flashcard.findMany({
          where: {
            approvalStatus: 'APPROVED',
            ...(lessonId && { lessonId }),
            ...(topicId && { topicId }),
            NOT: {
              userProgress: {
                some: {
                  userId,
                },
              },
            },
          },
          select: {
            id: true,
            cardType: true,
          },
        });
        statusConditions.push(
          ...unseenCards.map((c) => ({ cardId: c.id, cardType: c.cardType })),
        );
      }

      // Handle EASY, MEDIUM, HARD statuses (cards with progress records)
      const reviewedStatuses = statuses.filter((s) =>
        ['EASY', 'MEDIUM', 'HARD'].includes(s),
      );
      if (reviewedStatuses.length > 0) {
        const reviewedCards = await this.prisma.userFlashcardProgress.findMany({
          where: {
            userId,
            status: {
              in: reviewedStatuses as any,
            },
            flashcard: {
              approvalStatus: 'APPROVED',
              ...(lessonId && { lessonId }),
              ...(topicId && { topicId }),
            },
          },
          select: {
            flashcardId: true,
            flashcard: {
              select: {
                cardType: true,
              },
            },
          },
        });
        statusConditions.push(
          ...reviewedCards.map((r) => ({
            cardId: r.flashcardId,
            cardType: r.flashcard.cardType,
          })),
        );
      }

      if (statusConditions.length === 0) {
        throw new HttpException(
          `No cards found matching selected statuses: ${statuses.join(', ')}`,
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.log(
        `Found ${statusConditions.length} cards matching statuses`,
      );

      // Apply pattern-based weighting for LANDMARK cards (Anatomy enhancement)
      let cards = statusConditions;
      if (enablePatternWeighting) {
        const landmarkCards = cards.filter((c) =>
          ['STRUCTURE_ID', 'CONTENTS_OF_SPACE', 'TOPOGRAPHIC_MAP'].includes(
            c.cardType,
          ),
        );
        const otherCards = cards.filter(
          (c) =>
            !['STRUCTURE_ID', 'CONTENTS_OF_SPACE', 'TOPOGRAPHIC_MAP'].includes(
              c.cardType,
            ),
        );

        // Duplicate LANDMARK cards to increase probability (2x weight)
        cards = [...landmarkCards, ...landmarkCards, ...otherCards];
        this.logger.log(
          `Pattern weighting enabled: ${landmarkCards.length} LANDMARK cards weighted 2x`,
        );
      }

      // Fisher-Yates shuffle algorithm for randomization
      const shuffledCards = this.shuffleArray([...cards]);

      // Take limit, then deduplicate (in case of weighted duplicates)
      const selectedCardIds = [
        ...new Set(shuffledCards.slice(0, limit * 2).map((c) => c.cardId)),
      ].slice(0, limit);

      this.logger.log(`Selected ${selectedCardIds.length} cards after shuffle`);

      // Create session
      const sessionId = uuidv4();
      const queue = selectedCardIds.map((cardId, index) => ({
        cardId,
        priority: index,
      }));

      const session: StudySession = {
        id: sessionId,
        userId,
        queue,
        completedCards: [],
        createdAt: new Date(),
      };

      activeSessions.set(sessionId, session);

      // Clean up old sessions (older than 24 hours)
      this.cleanupOldSessions();

      return {
        success: true,
        sessionId,
        totalCards: selectedCardIds.length,
        statuses,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get next card in session
   */
  async getNextCard(sessionId: string, userId: string) {
    try {
      const session = activeSessions.get(sessionId);

      if (!session) {
        throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
      }

      if (session.userId !== userId) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      // Find next uncompleted card
      const nextItem = session.queue.find(
        (item) => !session.completedCards.includes(item.cardId),
      );

      if (!nextItem) {
        // Session complete
        return {
          success: true,
          completed: true,
          sessionComplete: true,
          message: 'Session completed',
          totalReviewed: session.completedCards.length,
        };
      }

      // Get card with full details
      const card = await this.prisma.flashcard.findUnique({
        where: {
          id: nextItem.cardId,
        },
        include: {
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
          subtopic: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
          knowledgePoint: {
            select: {
              id: true,
              fact: true,
              priority: true,
              examRelevance: true,
              examPattern: true,
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
              subtopic: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                },
              },
            },
          },
          userProgress: {
            where: {
              userId,
            },
          },
        },
      });

      if (!card) {
        throw new HttpException('Card not found', HttpStatus.NOT_FOUND);
      }

      const progress = card.userProgress[0];
      const remainingCards =
        session.queue.length - session.completedCards.length;
      const currentPosition = session.completedCards.length + 1;

      return {
        success: true,
        completed: false,
        position: currentPosition,
        card: {
          id: card.id,
          cardId: card.id, // Same as id, for compatibility with SessionCard type
          front: card.front,
          back: card.back,
          cardType: card.cardType,
          difficulty: card.difficulty,
          imageAssetId: card.imageAssetId,
          visualRequirement: card.visualRequirement,
          visualContext: card.visualContext,
          highlightRegion: card.highlightRegion,
          lesson: card.lesson,
          topic: card.topic,
          subtopic: card.subtopic,
          knowledgePoint: card.knowledgePoint,
        },
        progress: progress
          ? {
              status: progress.status,
              lastReview: progress.lastReview,
              totalReviews: progress.totalReviews,
            }
          : null,
        sessionInfo: {
          remainingCards,
          totalCards: session.queue.length,
          completedCards: session.completedCards.length,
        },
        sessionComplete: false,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get next card: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // ============================================
  // 2. CARD REVIEW
  // ============================================

  /**
   * Review card and update status
   */
  async reviewCard(
    userId: string,
    cardId: string,
    response: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY' | 'MEDIUM',
    sessionId?: string,
  ) {
    // Map SRS responses to status (for status-based system)
    let status: 'EASY' | 'MEDIUM' | 'HARD';
    
    switch (response) {
      case 'AGAIN':
        status = 'HARD'; // Need to review again - mark as HARD
        break;
      case 'HARD':
        status = 'HARD'; // Difficult - mark as HARD
        break;
      case 'GOOD':
      case 'MEDIUM':
        status = 'MEDIUM'; // OK - mark as MEDIUM
        break;
      case 'EASY':
        status = 'EASY'; // Mastered - mark as EASY
        break;
    }

    // Update progress in database
    const progress = await this.prisma.userFlashcardProgress.upsert({
      where: { userId_flashcardId: { userId, flashcardId: cardId } },
      update: {
        status,
        totalReviews: { increment: 1 },
        lastReview: new Date(),
      },
      create: {
        userId,
        flashcardId: cardId,
        status,
        totalReviews: 1,
        lastReview: new Date(),
      },
    });

    // Mark card as completed in session if sessionId provided
    if (sessionId) {
      const session = activeSessions.get(sessionId);
      if (session && !session.completedCards.includes(cardId)) {
        session.completedCards.push(cardId);
        this.logger.log(
          `Card ${cardId} marked as completed in session ${sessionId}. Progress: ${session.completedCards.length}/${session.queue.length}`,
        );
      }
    }

    return progress;
  }

  /**
   * Toggle favorite status for a card
   */
  async toggleFavorite(userId: string, cardId: string, isFavorite: boolean) {
    try {
      // For now, we'll track favorites in the progress record
      // In production, you might want a separate UserFavoriteCard table

      await this.prisma.userFlashcardProgress.upsert({
        where: {
          userId_flashcardId: {
            userId,
            flashcardId: cardId,
          },
        },
        create: {
          userId,
          flashcardId: cardId,
          status: 'UNSEEN',
        },
        update: {},
      });

      return {
        success: true,
        isFavorite,
        message: isFavorite ? 'Added to favorites' : 'Removed from favorites',
      };
    } catch (error) {
      this.logger.error(
        `Failed to toggle favorite: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        'Failed to toggle favorite',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // 3. ANALYTICS & REPORTING
  // ============================================

  /**
   * Get mastery percentage by lesson
   * Mastered = EASY status
   */
  async getMasteryByLesson(userId: string) {
    try {
      const lessons = await this.prisma.lesson.findMany({
        where: {
          flashcards: {
            some: {
              approvalStatus: 'APPROVED',
            },
          },
        },
        select: {
          id: true,
          name: true,
          displayName: true,
        },
      });

      const mastery: Record<string, { percentage: number; details: any }> = {};

      for (const lesson of lessons) {
        const totalCards = await this.prisma.flashcard.count({
          where: {
            lessonId: lesson.id,
            approvalStatus: 'APPROVED',
          },
        });

        // Mastered cards: status = EASY
        const masteredCards = await this.prisma.userFlashcardProgress.count({
          where: {
            userId,
            flashcard: {
              lessonId: lesson.id,
              approvalStatus: 'APPROVED',
            },
            status: 'EASY',
          },
        });

        const percentage =
          totalCards > 0 ? (masteredCards / totalCards) * 100 : 0;

        mastery[lesson.name] = {
          percentage: Math.round(percentage),
          details: {
            masteredCards,
            totalCards,
            lessonDisplayName: lesson.displayName,
          },
        };
      }

      return {
        success: true,
        mastery,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get mastery: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        'Failed to get mastery data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get study activity for last N days (heatmap data)
   */
  async getStudyActivity(userId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all reviews in date range
      const reviews = await this.prisma.userFlashcardProgress.findMany({
        where: {
          userId,
          lastReview: {
            gte: startDate,
          },
        },
        select: {
          lastReview: true,
          totalReviews: true,
        },
      });

      // Group by date
      const activityMap = new Map<string, number>();

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        activityMap.set(dateStr, 0);
      }

      reviews.forEach((review) => {
        if (review.lastReview) {
          const dateStr = review.lastReview.toISOString().split('T')[0];
          if (activityMap.has(dateStr)) {
            activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1);
          }
        }
      });

      // Convert to array format
      const activity = Array.from(activityMap.entries()).map(
        ([date, count]) => ({
          date,
          count,
        }),
      );

      return {
        success: true,
        activity,
        totalDays: days,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get study activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        'Failed to get study activity',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get overall flashcard statistics
   */
  async getOverallStats(userId: string) {
    try {
      const totalProgress = await this.prisma.userFlashcardProgress.count({
        where: { userId },
      });

      const totalReviews = await this.prisma.userFlashcardProgress.aggregate({
        where: { userId },
        _sum: {
          totalReviews: true,
        },
      });

      const correctReviews = await this.prisma.userFlashcardProgress.aggregate({
        where: { userId },
        _sum: {
          correctCount: true,
        },
      });

      // Mastered cards (EASY status)
      const masteredCards = await this.prisma.userFlashcardProgress.count({
        where: {
          userId,
          status: 'EASY',
        },
      });

      // Cards needing review (HARD + MEDIUM)
      const cardsNeedingReview = await this.prisma.userFlashcardProgress.count({
        where: {
          userId,
          status: {
            in: ['HARD', 'MEDIUM'],
          },
        },
      });

      // Status distribution
      const easyCards = await this.prisma.userFlashcardProgress.count({
        where: { userId, status: 'EASY' },
      });
      const mediumCards = await this.prisma.userFlashcardProgress.count({
        where: { userId, status: 'MEDIUM' },
      });
      const hardCards = await this.prisma.userFlashcardProgress.count({
        where: { userId, status: 'HARD' },
      });

      const accuracy =
        totalReviews._sum.totalReviews && correctReviews._sum.correctCount
          ? (correctReviews._sum.correctCount /
              totalReviews._sum.totalReviews) *
            100
          : 0;

      return {
        success: true,
        stats: {
          totalCards: totalProgress,
          totalReviews: totalReviews._sum.totalReviews || 0,
          masteredCards,
          cardsNeedingReview,
          accuracy: Math.round(accuracy),
          statusDistribution: {
            easy: easyCards,
            medium: mediumCards,
            hard: hardCards,
          },
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get overall stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        'Failed to get statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Fisher-Yates shuffle algorithm for randomizing card order
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Clean up sessions older than 24 hours
   */
  private cleanupOldSessions() {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24);

    for (const [sessionId, session] of activeSessions.entries()) {
      if (session.createdAt < cutoffTime) {
        activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Serve visual asset file (automatically detects extension)
   */
  async serveVisualAsset(assetId: string, res: any) {
    try {
      const uploadsDir =
        process.env.VISUAL_ASSETS_DIR ||
        path.join(process.cwd(), 'uploads', 'visual-assets');

      // Try different extensions
      const extensions = ['.png', '.jpeg', '.jpg', '.svg'];
      let filePath: string | null = null;

      for (const ext of extensions) {
        const testPath = path.join(uploadsDir, `${assetId}${ext}`);
        try {
          await fs.access(testPath);
          filePath = testPath;
          break;
        } catch {
          // File doesn't exist with this extension, try next
          continue;
        }
      }

      if (!filePath) {
        this.logger.warn(`Visual asset not found: ${assetId}`);
        throw new HttpException('Visual asset not found', HttpStatus.NOT_FOUND);
      }

      const file = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const contentType =
        ext === '.svg'
          ? 'image/svg+xml'
          : ext === '.png'
            ? 'image/png'
            : 'image/jpeg';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.send(file);
    } catch (error) {
      this.logger.error(
        `Failed to serve visual asset ${assetId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to serve visual asset',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
