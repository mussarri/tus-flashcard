/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FlashcardGenerationService } from './flashcard-generation.service';
import { AdaptiveAlgorithmService } from './adaptive-algorithm.service';
import { PrismaService } from '../prisma/prisma.service';
import { AIProviderType } from '@prisma/client';
import { VisualAssetService } from '../common/services/visual-asset.service';

@Controller('flashcards')
export class FlashcardGenerationController {
  private readonly logger = new Logger(FlashcardGenerationController.name);

  constructor(
    private flashcardService: FlashcardGenerationService,
    private adaptiveService: AdaptiveAlgorithmService,
    private prisma: PrismaService,
    private visualAssetService: VisualAssetService,
  ) {}

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Generate flashcards from knowledge points (batch)
   */
  @Post('admin/generate/knowledge-points')
  async generateFromKnowledgePoints(
    @Body() body: { knowledgePointIds: string[]; provider?: AIProviderType },
  ) {
    this.logger.log(
      `Admin generating flashcards from ${body.knowledgePointIds.length} KPs`,
    );

    const results: Array<{
      knowledgePointId: string;
      savedCount?: number;
      error?: string;
      success: boolean;
    }> = [];
    for (const kpId of body.knowledgePointIds) {
      try {
        const flashcards = await this.flashcardService.generateFlashcards(kpId);
        const savedCount = await this.flashcardService.saveFlashcards(
          kpId,
          flashcards,
        );
        results.push({ knowledgePointId: kpId, savedCount, success: true });
      } catch (error) {
        results.push({
          knowledgePointId: kpId,
          error: error.message,
          success: false,
        });
      }
    }

    return {
      total: body.knowledgePointIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * @deprecated Use /knowledge-extraction/admin/generate/exam-questions instead
   * Generate flashcards from exam questions (EXCEPT_TRAP, CLINICAL_CORRELATION)
   * This endpoint is deprecated. The new flow is:
   * 1. Generate KPs from exam questions via /knowledge-extraction/admin/generate/exam-questions
   * 2. Generate flashcards from KPs via /flashcards/admin/generate/knowledge-points
   */
  @Post('admin/generate/exam-questions')
  async generateFromExamQuestions(
    @Body() body: { examQuestionIds: string[]; provider?: AIProviderType },
  ) {
    this.logger.warn(
      'DEPRECATED: /flashcards/admin/generate/exam-questions endpoint is deprecated. Use /knowledge-extraction/admin/generate/exam-questions instead.',
    );

    this.logger.log(
      `Admin generating flashcards from ${body.examQuestionIds.length} exam questions`,
    );

    const results: Array<{
      examQuestionId: string;
      savedCount?: number;
      error?: string;
      success: boolean;
    }> = [];
    for (const eqId of body.examQuestionIds) {
      try {
        const flashcards =
          await this.flashcardService.generateFromExamQuestion(eqId);
        const savedCount =
          await this.flashcardService.saveExamQuestionFlashcards(
            eqId,
            flashcards,
          );
        results.push({ examQuestionId: eqId, savedCount, success: true });
      } catch (error) {
        results.push({
          examQuestionId: eqId,
          error: error.message,
          success: false,
        });
      }
    }

    return {
      total: body.examQuestionIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Get pending flashcards for admin approval
   */
  @Get('admin/pending')
  async getPendingFlashcards(
    @Query('limit') limit?: string,
    @Query('cardType') cardType?: string,
    @Query('lessonId') lessonId?: string,
  ) {
    const where: any = { approvalStatus: 'PENDING' };
    if (cardType) where.cardType = cardType;
    if (lessonId) where.lessonId = lessonId;

    const flashcards = await this.prisma.flashcard.findMany({
      where,
      include: {
        lesson: true,
        topic: true,
        subtopic: true,
        knowledgePoint: true,
        examQuestion: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 50,
    });

    return { flashcards, count: flashcards.length };
  }

  /**
   * Approve flashcard
   */
  @Patch('admin/:id/approve')
  async approveFlashcard(
    @Param('id') id: string,
    @Body() body: { adminUserId: string; visualAssetId?: string },
  ) {
    const flashcard = await this.prisma.flashcard.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: body.adminUserId,
        imageAssetId: body.visualAssetId,
        visualStatus: body.visualAssetId ? 'UPLOADED' : undefined,
      },
    });

    return { success: true, flashcard };
  }

  /**
   * Reject flashcard
   */
  @Patch('admin/:id/reject')
  async rejectFlashcard(
    @Param('id') id: string,
    @Body() body: { adminUserId: string; reason: string },
  ) {
    const flashcard = await this.prisma.flashcard.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        approvedBy: body.adminUserId,
        // Store rejection reason in a custom field if needed
      },
    });

    return { success: true, flashcard };
  }

  /**
   * Upload visual asset for flashcard
   */
  @Post('admin/:id/upload-visual')
  @UseInterceptors(FileInterceptor('image'))
  async uploadVisual(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Save visual asset
    const asset = await this.visualAssetService.saveVisualAsset(file);

    // Create ImageAsset record in database
    await this.prisma.imageAsset.create({
      data: {
        id: asset.id,
        fileName: asset.originalName,
        filePath: asset.filePath,
        mimeType: asset.mimeType,
        fileSize: file.size,
      },
    });

    const flashcard = await this.prisma.flashcard.update({
      where: { id },
      data: {
        imageAssetId: asset.id,
        visualStatus: 'UPLOADED',
      },
    });

    return {
      success: true,
      visualAssetId: asset.id,
      flashcard,
    };
  }

  /**
   * Get flashcard statistics
   */
  @Get('admin/stats')
  async getFlashcardStats() {
    const [total, pending, approved, rejected, requiresVisual, visualUploaded] =
      await Promise.all([
        this.prisma.flashcard.count(),
        this.prisma.flashcard.count({ where: { approvalStatus: 'PENDING' } }),
        this.prisma.flashcard.count({ where: { approvalStatus: 'APPROVED' } }),
        this.prisma.flashcard.count({ where: { approvalStatus: 'REJECTED' } }),
        this.prisma.flashcard.count({ where: { visualStatus: 'REQUIRED' } }),
        this.prisma.flashcard.count({ where: { visualStatus: 'UPLOADED' } }),
      ]);

    const byCardType = await this.prisma.flashcard.groupBy({
      by: ['cardType'],
      _count: true,
    });

    return {
      total,
      pending,
      approved,
      rejected,
      requiresVisual,
      visualUploaded,
      byCardType,
    };
  }

  // ============================================
  // STUDENT ENDPOINTS
  // ============================================

  /**
   * Get due cards for review
   */
  @Get('student/:userId/due')
  async getDueCards(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const cardIds = await this.adaptiveService.getDueCards(
      userId,
      limit ? parseInt(limit) : 20,
    );

    const cards = await this.prisma.flashcard.findMany({
      where: {
        id: { in: cardIds },
        approvalStatus: 'APPROVED',
      },
      include: {
        lesson: true,
        topic: true,
        userProgress: {
          where: { userId },
        },
      },
    });

    return { cards, count: cards.length };
  }

  /**
   * Submit review response
   */
  @Post('student/:userId/review')
  async submitReview(
    @Param('userId') userId: string,
    @Body()
    body: {
      flashcardId: string;
      response: 'CORRECT' | 'INCORRECT' | 'FELL_FOR_TRAP';
    },
  ): Promise<{
    success: boolean;
    trapLoop: any | null;
    nextCardId: string | null;
  }> {
    // Update card progress with SM-2 algorithm
    await this.adaptiveService.updateCardProgress(
      userId,
      body.flashcardId,
      body.response,
    );

    // Check for trap loop
    const trapLoop = await this.adaptiveService.detectTrapLoop(
      userId,
      body.flashcardId,
    );

    // Get next card
    const nextCards = await this.adaptiveService.getDueCards(userId, 1);

    return {
      success: true,
      trapLoop,
      nextCardId: nextCards[0] || null,
    };
  }

  /**
   * Get student analytics
   */
  @Get('student/:userId/analytics')
  async getStudentAnalytics(@Param('userId') userId: string) {
    const analytics = await this.adaptiveService.getUserAnalytics(userId);

    const patternMastery = await this.prisma.patternMastery.findMany({
      where: { userId },
      orderBy: { masteryScore: 'asc' },
    });

    return {
      ...analytics,
      patternMastery,
    };
  }

  /**
   * Get prerequisite cards for backtracking
   */
  @Get('student/:userId/prerequisites/:flashcardId')
  async getPrerequisiteCards(
    @Param('userId') userId: string,
    @Param('flashcardId') flashcardId: string,
  ) {
    const prerequisiteCardIds = await this.adaptiveService.getPrerequisiteCards(
      userId,
      flashcardId,
    );

    const cards = await this.prisma.flashcard.findMany({
      where: {
        id: { in: prerequisiteCardIds },
        approvalStatus: 'APPROVED',
      },
      include: {
        lesson: true,
        topic: true,
      },
    });

    return { cards, count: cards.length };
  }

  /**
   * Check backtracking recommendation
   */
  @Get('student/:userId/backtrack-check/:examPattern')
  async checkBacktracking(
    @Param('userId') userId: string,
    @Param('examPattern') examPattern: string,
  ): Promise<any> {
    const result = await this.adaptiveService.checkBacktracking(
      userId,
      examPattern,
    );
    return result;
  }

  /**
   * Get all approved flashcards for a lesson/topic
   */
  @Get('student/browse')
  async browseFlashcards(
    @Query('lessonId') lessonId?: string,
    @Query('topicId') topicId?: string,
    @Query('cardType') cardType?: string,
  ) {
    const where: any = { approvalStatus: 'APPROVED' };
    if (lessonId) where.lessonId = lessonId;
    if (topicId) where.topicId = topicId;
    if (cardType) where.cardType = cardType;

    const flashcards = await this.prisma.flashcard.findMany({
      where,
      include: {
        lesson: true,
        topic: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { flashcards, count: flashcards.length };
  }
}
