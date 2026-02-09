import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { StudentFlashcardService } from './student-flashcard.service';

/**
 * Student-facing flashcard controller
 * Handles status-based sessions, review management, and analytics
 */
@Controller('api/student/flashcards')
export class StudentFlashcardController {
  constructor(private readonly flashcardService: StudentFlashcardService) {}

  // ============================================
  // 1. SESSION MANAGEMENT
  // ============================================

  /**
   * GET /api/student/flashcards/overview
   * Get daily card overview (due, learning, new) grouped by lesson
   */
  @Get('overview')
  async getDailyOverview(@Query('userId') userId: string) {
    if (!userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    return this.flashcardService.getDailyOverview(userId);
  }

  /**
   * POST /api/student/flashcards/session
   * Create a new study session with status-based filtering
   * Accepts multiple statuses: UNSEEN, EASY, MEDIUM, HARD
   */
  @Post('session')
  async createSession(
    @Body()
    body: {
      userId: string;
      lessonId?: string;
      topicId?: string;
      statuses: string[]; // Multi-select: ['UNSEEN', 'HARD', 'MEDIUM']
      limit?: number;
      enablePatternWeighting?: boolean; // Prioritize LANDMARK cards
    },
  ) {
    console.log(body);

    if (!body.userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    if (!body.statuses || body.statuses.length === 0) {
      throw new HttpException(
        'At least one status must be selected',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.flashcardService.createSession({
      userId: body.userId,
      lessonId: body.lessonId,
      topicId: body.topicId,
      statuses: body.statuses,
      limit: body.limit || 20,
      enablePatternWeighting: body.enablePatternWeighting || false,
    });
  }

  /**
   * GET /api/student/flashcards/session/:sessionId/next
   * Get next card in the session queue
   */
  @Get('session/:sessionId/next')
  async getNextCard(
    @Param('sessionId') sessionId: string,
    @Query('userId') userId: string,
  ) {
    if (!userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    return this.flashcardService.getNextCard(sessionId, userId);
  }

  // ============================================
  // 2. PROGRESS & SRS
  // ============================================

  /**
   * POST /api/student/flashcards/:cardId/review
   * Submit user response and update card status
   */
  @Post(':cardId/review')
  async reviewCard(
    @Param('cardId') cardId: string,
    @Body()
    body: {
      userId: string;
      response: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY' | 'MEDIUM';
      sessionId?: string;
    },
  ) {
    if (!cardId || cardId === 'undefined' || cardId === 'null') {
      throw new HttpException(
        'Card ID is required and must be valid',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!body.userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    if (!body.response) {
      throw new HttpException('Response is required', HttpStatus.BAD_REQUEST);
    }

    const validResponses = ['AGAIN', 'HARD', 'GOOD', 'EASY', 'MEDIUM'];
    if (!validResponses.includes(body.response)) {
      throw new HttpException(
        `Invalid response. Must be one of: ${validResponses.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.flashcardService.reviewCard(body.userId, cardId, body.response, body.sessionId);
  }

  /**
   * PATCH /api/student/flashcards/:cardId/favorite
   * Toggle favorite/starred status for a card
   */
  @Patch(':cardId/favorite')
  async toggleFavorite(
    @Param('cardId') cardId: string,
    @Body() body: { userId: string; isFavorite: boolean },
  ) {
    if (!body.userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    return this.flashcardService.toggleFavorite(
      body.userId,
      cardId,
      body.isFavorite,
    );
  }

  // ============================================
  // 3. ANALYTICS & REPORTING
  // ============================================

  /**
   * GET /api/student/flashcards/mastery
   * Get mastery percentage by lesson
   */
  @Get('mastery')
  async getMasteryByLesson(@Query('userId') userId: string) {
    if (!userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    return this.flashcardService.getMasteryByLesson(userId);
  }

  /**
   * GET /api/student/flashcards/activity
   * Get study activity for last 30 days (heatmap data)
   */
  @Get('activity')
  async getStudyActivity(
    @Query('userId') userId: string,
    @Query('days') days?: string,
  ) {
    if (!userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    return this.flashcardService.getStudyActivity(
      userId,
      days ? parseInt(days, 10) : 30,
    );
  }

  /**
   * GET /api/student/flashcards/stats
   * Get overall flashcard statistics for user
   */
  @Get('stats')
  async getOverallStats(@Query('userId') userId: string) {
    if (!userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    return this.flashcardService.getOverallStats(userId);
  }

  /**
   * GET /api/student/flashcards/visual-assets/:assetId
   * Serve visual asset file (detects extension automatically)
   */
  @Get('visual-assets/:assetId')
  async getVisualAsset(@Param('assetId') assetId: string, @Res() res: any) {
    return this.flashcardService.serveVisualAsset(assetId, res);
  }
}
