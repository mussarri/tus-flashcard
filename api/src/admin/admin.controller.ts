/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Param,
  Body,
  Logger,
  HttpException,
  Get,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  ConflictException,
  Res,
  Delete,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { ExamIntelligenceService } from './exam-intelligence.service';
import { GenerateTopicDto, GenerationMode } from './dto/generate-topic.dto';
import { CreateManualContentDto } from './dto/create-manual-content.dto';
import { MergeTopicDto } from './dto/merge-topic.dto';
import { CreateOntologyEntityDto } from './dto/create-ontology-entity.dto';
import { BulkResolveOntologyDto } from './dto/bulk-resolve-ontology.dto';
import {
  FlashcardListQueryDto,
  BindVisualDto,
} from './dto/flashcard-visual.dto';
import {
  CreateExamQuestionDto,
  UpdateExamQuestionDto,
  ExamQuestionListQueryDto,
  LinkKnowledgePointDto,
  BulkParseDto,
  BulkImportDto,
} from './dto/exam-question.dto';
import {
  BulkUploadPreviewDto,
  BulkUploadSaveDto,
  BulkAnalyzeDto,
} from './dto/bulk-upload.dto';
import { UpdateAITaskConfigDto } from './dto/ai-config.dto';
import {
  MergePrerequisiteDto,
  MergePreviewDto,
} from './dto/merge-prerequisite.dto';
import { MergeLabelOnlyPrerequisiteDto } from './dto/merge-label-only-prerequisite.dto';
import { PrerequisiteQueryDto } from './dto/prerequisite-query.dto';
import {
  PrerequisiteDetailQueryDto,
  PrerequisiteDetailResponseDto,
} from './dto/prerequisite-detail.dto';
import { AITaskType } from '@prisma/client';

@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly examIntelligenceService: ExamIntelligenceService,
  ) {}

  @Get('topics')
  async getTopics(
    @Query('lessonId') lessonId?: string,
    @Query('topicId') topicId?: string,
    @Query('search') search?: string,
  ) {
    try {
      const filters: { lessonId?: string; topicId?: string; search?: string } =
        {};
      if (lessonId) filters.lessonId = lessonId;
      if (topicId) filters.topicId = topicId;
      if (search) filters.search = search;

      const result = await this.adminService.getTopics(filters);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get topics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get topics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('topics/:topicId/generate-flashcards')
  async generateFlashcardsForTopic(
    @Param('topicId') topicId: string,
    @Body() body: GenerateTopicDto,
  ) {
    try {
      this.logger.log(
        `Generating flashcards for topic: ${topicId} (mode: ${body.mode || 'append'})`,
      );

      const mode = body.mode || GenerationMode.APPEND;
      const provider = body.provider;
      const result = await this.adminService.generateFlashcardsForTopic(
        topicId,
        mode,
        provider,
      );

      return {
        success: true,
        topic: topicId,
        mode,
        provider: provider || 'default',
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate flashcards for topic ${topicId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to generate flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('knowledge-points/batch-generate-flashcards')
  async batchGenerateFlashcards(@Body() body: { knowledgePointIds: string[] }) {
    try {
      this.logger.log(
        `Batch generating flashcards for ${body.knowledgePointIds.length} knowledge points`,
      );

      const result =
        await this.adminService.generateFlashcardsForKnowledgePoints(
          body.knowledgePointIds,
        );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to batch generate flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to batch generate flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('topics/merge')
  async mergeTopics(@Body() body: MergeTopicDto) {
    try {
      const result = await this.adminService.mergeTopics(body);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to merge topics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to merge topics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('subtopics/merge')
  async mergeSubtopics(
    @Body()
    body: {
      lessonId: string;
      topicId: string;
      sourceSubtopicId: string;
      targetSubtopicId: string;
    },
  ) {
    try {
      const result = await this.adminService.mergeSubtopics(body);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to merge subtopics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to merge subtopics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('topics/:topicId/generate-questions')
  async generateQuestionsForTopic(
    @Param('topicId') topicId: string,
    @Body() body: GenerateTopicDto,
  ) {
    try {
      this.logger.log(
        `Generating questions for topic: ${topicId} (mode: ${body.mode || 'append'})`,
      );

      const mode = body.mode || GenerationMode.APPEND;
      const provider = body.provider;
      const result = await this.adminService.generateQuestionsForTopic(
        topicId,
        mode,
        provider,
      );

      return {
        success: true,
        topic: topicId,
        mode,
        provider: provider || 'default',
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate questions for topic ${topicId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('manual-content')
  async createManualContent(@Body() body: CreateManualContentDto) {
    try {
      this.logger.log(
        `Creating manual content batch for topic ID: ${body.topicId}`,
      );

      // TODO: Get actual admin user ID from auth
      const createdBy = 'admin-user-id';

      const result = await this.adminService.createManualContent(
        body.topicId,
        body.description,
        body.contentType,
        body.textContent,
        createdBy,
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create manual content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to create manual content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('approved-contents/:id/extract-knowledge')
  async extractKnowledgeForContent(@Param('id') approvedContentId: string) {
    try {
      this.logger.log(
        `Triggering knowledge extraction for approvedContent: ${approvedContentId}`,
      );

      const result =
        await this.adminService.extractKnowledgeForContent(approvedContentId);

      return {
        success: true,
        approvedContentId,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to trigger knowledge extraction for approvedContent ${approvedContentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to trigger knowledge extraction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('batches/:id/extract-knowledge')
  async extractKnowledgeForBatch(@Param('id') batchId: string) {
    try {
      this.logger.log(`Triggering knowledge extraction for batch: ${batchId}`);

      const result = await this.adminService.extractKnowledgeForBatch(batchId);

      return {
        success: true,
        batchId,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to trigger knowledge extraction for batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to trigger knowledge extraction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  // ============================================
  // KNOWLEDGE POINTS
  // ============================================

  @Get('knowledge-points')
  async getAllKnowledgePoints(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('filterByLesson') filterByLesson?: string,
    @Query('filterByApprovalStatus') filterByApprovalStatus?: string,
    @Query('search') searchQuery?: string,
    @Query('hasFlashcard') hasFlashcard?: string,
  ) {
    try {
      this.logger.log('Getting all knowledge points');
      console.log('kp');

      const result = await this.adminService.getAllKnowledgePoints(
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 50,
        sortBy || 'createdAt',
        sortOrder || 'desc',
        filterByLesson,
        filterByApprovalStatus,
        searchQuery,
        hasFlashcard !== undefined ? hasFlashcard === 'true' : undefined,
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get knowledge points: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new HttpException(
        `Failed to get knowledge points: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('batches/:id/knowledge-points')
  async getKnowledgePointsForBatch(@Param('id') batchId: string) {
    try {
      this.logger.log(`Getting knowledge points for batch: ${batchId}`);

      const knowledgePoints =
        await this.adminService.getKnowledgePointsForBatch(batchId);

      return {
        success: true,
        batchId,
        knowledgePoints,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get knowledge points for batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to get knowledge points: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('approved-contents/:id/knowledge-points')
  async getKnowledgePointsForContent(@Param('id') approvedContentId: string) {
    try {
      this.logger.log(
        `Getting knowledge points for approvedContent: ${approvedContentId}`,
      );

      const knowledgePoints =
        await this.adminService.getKnowledgePointsForContent(approvedContentId);

      return {
        success: true,
        approvedContentId,
        knowledgePoints,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get knowledge points for approvedContent ${approvedContentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to get knowledge points: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('batches/:id/flashcards')
  async getFlashcardsForBatch(@Param('id') batchId: string) {
    try {
      this.logger.log(`Getting flashcards for batch: ${batchId}`);

      const flashcards = await this.adminService.getFlashcardsForBatch(batchId);

      return {
        success: true,
        batchId,
        flashcards,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get flashcards for batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to get flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('topics/:topicId/flashcards')
  async getFlashcardsForTopic(@Param('topicId') topicId: string) {
    try {
      this.logger.log(`Getting flashcards for topic: ${topicId}`);

      const flashcards = await this.adminService.getFlashcardsForTopic(topicId);

      return {
        success: true,
        topic: topicId,
        flashcards,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get flashcards for topic ${topicId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to get flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('batches/:id/questions')
  async getQuestionsForBatch(@Param('id') batchId: string) {
    try {
      this.logger.log(`Getting questions for batch: ${batchId}`);

      const questions = await this.adminService.getQuestionsForBatch(batchId);

      return {
        success: true,
        batchId,
        questions,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get questions for batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to get questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('topics/:topicId/questions')
  async getQuestionsForTopic(@Param('topicId') topicId: string) {
    try {
      this.logger.log(`Getting questions for topic: ${topicId}`);

      const questions = await this.adminService.getQuestionsForTopic(topicId);

      return {
        success: true,
        topic: topicId,
        questions,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get questions for topic ${topicId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to get questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('knowledge/review')
  async getKnowledgePointsForReview(
    @Query('batchId') batchId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('filterByLesson') filterByLesson?: string,
    @Query('filterByPattern') filterByPattern?: string,
    @Query('minSimilarity') minSimilarity?: string,
    @Query('hasFlashcard') hasFlashcard?: string,
  ) {
    try {
      this.logger.log(
        `Getting knowledge points for review${batchId ? ` (batch: ${batchId})` : ''}`,
      );
      console.log(hasFlashcard);

      const result = await this.adminService.getKnowledgePointsForReview(
        batchId,
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 50,
        sortBy || 'createdAt',
        sortOrder || 'desc',
        filterByLesson,
        filterByPattern,
        minSimilarity ? parseFloat(minSimilarity) : undefined,
        hasFlashcard !== undefined ? hasFlashcard === 'true' : undefined,
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get knowledge points for review: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to get knowledge points for review: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('knowledge/:id/approve')
  async approveKnowledgePoint(@Param('id') knowledgePointId: string) {
    try {
      this.logger.log(`Approving knowledge point: ${knowledgePointId}`);

      const result =
        await this.adminService.approveKnowledgePoint(knowledgePointId);

      return {
        success: true,
        knowledgePoint: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to approve knowledge point ${knowledgePointId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to approve knowledge point: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('knowledge/bulk-approve')
  async bulkApproveKnowledgePoints(@Body() body: { ids: string[] }) {
    try {
      this.logger.log(`Bulk approving ${body.ids.length} knowledge points`);

      const results = await Promise.allSettled(
        body.ids.map((id) => this.adminService.approveKnowledgePoint(id)),
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      return {
        success: true,
        message: `Approved ${successful} knowledge points`,
        successful,
        failed,
      };
    } catch (error) {
      this.logger.error(
        `Failed to bulk approve knowledge points: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new HttpException(
        `Failed to bulk approve knowledge points: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('knowledge/bulk-reject')
  async bulkRejectKnowledgePoints(
    @Body() body: { ids: string[]; reason: string },
  ) {
    try {
      this.logger.log(`Bulk rejecting ${body.ids.length} knowledge points`);

      const results = await Promise.allSettled(
        body.ids.map((id) =>
          this.adminService.rejectKnowledgePoint(id, body.reason),
        ),
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      return {
        success: true,
        message: `Rejected ${successful} knowledge points`,
        successful,
        failed,
      };
    } catch (error) {
      this.logger.error(
        `Failed to bulk reject knowledge points: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new HttpException(
        `Failed to bulk reject knowledge points: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('knowledge/:sourceId/merge/:targetId')
  async mergeKnowledgePoints(
    @Param('sourceId') sourceId: string,
    @Param('targetId') targetId: string,
  ) {
    try {
      this.logger.log(`Merging knowledge point ${sourceId} into ${targetId}`);

      const result = await this.adminService.mergeKnowledgePoints(
        sourceId,
        targetId,
      );

      return {
        success: true,
        mergedKnowledgePoint: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to merge knowledge points: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to merge knowledge points: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('knowledge/:id/reject')
  async rejectKnowledgePoint(
    @Param('id') knowledgePointId: string,
    @Body() body: { reason: string },
  ) {
    try {
      this.logger.log(`Rejecting knowledge point: ${knowledgePointId}`);

      const result = await this.adminService.rejectKnowledgePoint(
        knowledgePointId,
        body.reason,
      );

      return {
        success: true,
        knowledgePoint: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to reject knowledge point ${knowledgePointId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to reject knowledge point: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  // ============================================
  // FLASHCARD VISUAL ENDPOINTS
  // ============================================

  @Get('flashcards')
  async getFlashcards(@Query() query: FlashcardListQueryDto) {
    try {
      const flashcards = await this.adminService.getFlashcardsWithVisual(query);
      return {
        success: true,
        flashcards,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('flashcards/:id')
  async getFlashcardDetail(@Param('id', ParseUUIDPipe) id: string) {
    try {
      const flashcard = await this.adminService.getFlashcardDetail(id);
      return {
        success: true,
        flashcard,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get flashcard ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get flashcard: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('flashcards/:id/visual')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFlashcardVisual(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      if (!file) {
        throw new HttpException('No file provided', 400);
      }

      const result = await this.adminService.uploadFlashcardVisual(id, file);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload visual for flashcard ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Post('flashcards/:id/visual/bind')
  async bindFlashcardVisual(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: BindVisualDto,
  ) {
    try {
      const flashcard = await this.adminService.bindFlashcardVisual(id, body);
      return {
        success: true,
        flashcard,
      };
    } catch (error) {
      this.logger.error(
        `Failed to bind visual for flashcard ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Get('image-assets')
  async getImageAssets(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const assets = await this.adminService.getImageAssets(
        search,
        limit ? parseInt(limit, 10) : 50,
      );
      return {
        success: true,
        assets,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get image assets: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get image assets: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('flashcards/:id/publish')
  async publishFlashcard(@Param('id', ParseUUIDPipe) id: string) {
    try {
      const flashcard = await this.adminService.publishFlashcard(id);
      return {
        success: true,
        flashcard,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(
        `Failed to publish flashcard ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to publish flashcard: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('flashcards/bulk-publish')
  async bulkPublishFlashcards(@Body() body: { ids: string[] }) {
    try {
      if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
        throw new HttpException('No flashcard IDs provided', 400);
      }

      const results = await this.adminService.bulkPublishFlashcards(body.ids);
      return {
        success: true,
        ...results,
      };
    } catch (error) {
      this.logger.error(
        `Failed to bulk publish flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to bulk publish flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Patch('flashcards/:id')
  async updateFlashcard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { front?: string; back?: string; cardType?: string },
  ) {
    try {
      const flashcard = await this.adminService.updateFlashcard(id, body);
      return {
        success: true,
        flashcard,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update flashcard ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to update flashcard: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Delete('flashcards/:id')
  async deleteFlashcard(@Param('id', ParseUUIDPipe) id: string) {
    try {
      await this.adminService.deleteFlashcard(id);
      return {
        success: true,
        message: 'Flashcard deleted successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete flashcard ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to delete flashcard: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('visual-assets/:assetId')
  async getVisualAsset(@Param('assetId') assetId: string, @Res() res: any) {
    try {
      const filePath = await this.adminService.getVisualAssetPath(assetId);
      if (!filePath) {
        throw new HttpException('Visual asset not found', 404);
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
      res.send(file);
    } catch (error) {
      this.logger.error(
        `Failed to get visual asset ${assetId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        `Failed to get visual asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('dashboard/kpi/missing-visuals')
  async getMissingVisualsKPI() {
    try {
      const kpi = await this.adminService.getMissingVisualsKPI();
      return {
        success: true,
        ...kpi,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get missing visuals KPI: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get missing visuals KPI: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  // ============================================
  // EXAM QUESTION ENDPOINTS
  // ============================================

  @Post('exam-questions')
  async createExamQuestion(@Body() body: CreateExamQuestionDto) {
    try {
      this.logger.log(
        `Creating exam question: ${body.year} - ${body.examType || 'N/A'}`,
      );

      // TODO: Get actual admin user ID from auth
      const uploadedBy = 'admin-user-id';

      const examQuestion = await this.adminService.createExamQuestion(
        body,
        uploadedBy,
      );

      return {
        success: true,
        examQuestion,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create exam question: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to create exam question: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('exam-questions/bulk-parse')
  bulkParse(@Body() body: BulkParseDto) {
    try {
      this.logger.log('Parsing bulk text input');
      const result = this.adminService.parseBulkText(body.text);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to parse bulk text: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to parse bulk text: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('exam-questions/bulk-import')
  async bulkImport(@Body() body: BulkImportDto) {
    try {
      this.logger.log(`Bulk importing ${body.questions.length} questions`);

      // TODO: Get actual admin user ID from auth
      const uploadedBy = 'admin-user-id';

      const result = await this.adminService.bulkImportQuestions(
        body.questions,
        uploadedBy,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to bulk import questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to bulk import questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('exam-questions')
  async getExamQuestions(@Query() query: ExamQuestionListQueryDto) {
    try {
      const result = await this.adminService.getExamQuestions(query);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get exam questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get exam questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('exam-questions/needs-review')
  async getQuestionsNeedingReview(@Query('lessonId') lessonId?: string) {
    try {
      const questions =
        await this.adminService.getQuestionsNeedingReview(lessonId);
      return {
        success: true,
        count: questions.length,
        questions,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get questions needing review: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get questions needing review: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('exam-questions/:id')
  async getExamQuestionById(@Param('id') id: string) {
    try {
      const examQuestion = await this.adminService.getExamQuestionById(id);

      return {
        success: true,
        examQuestion,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get exam question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get exam question: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('exam-questions/bulk-resolve-ontology')
  async bulkResolveOntology(@Body() body: BulkResolveOntologyDto) {
    console.log('Received body:', body);

    try {
      const { questionIds, action } = body;

      if (!questionIds || questionIds.length === 0) {
        throw new BadRequestException(
          'questionIds is required and cannot be empty',
        );
      }

      const results = {
        total: questionIds.length,
        success: 0,
        failed: 0,
        errors: [] as Array<{ questionId: string; error: string }>,
      };

      // Process all questions
      for (const questionId of questionIds) {
        try {
          await this.adminService.resolveOntologyMismatches(questionId, {
            action,
          });
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            questionId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          this.logger.error(
            `Failed to resolve question ${questionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      return {
        message: `Bulk resolve completed: ${results.success} succeeded, ${results.failed} failed`,
        action,
        ...results,
      };
    } catch (error) {
      this.logger.error(
        `Failed to bulk resolve ontology: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to bulk resolve: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('exam-questions/:id')
  async updateExamQuestion(
    @Param('id') id: string,
    @Body() body: UpdateExamQuestionDto,
  ) {
    try {
      const examQuestion = await this.adminService.updateExamQuestion(id, body);
      return {
        success: true,
        examQuestion,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update exam question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to update exam question: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('exam-questions/bulk/analyze')
  async bulkAnalyze(@Body() body: BulkAnalyzeDto) {
    try {
      this.logger.log(`Bulk analyzing ${body.questionIds.length} questions`);
      const result = await this.adminService.bulkAnalyze(body.questionIds);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to bulk analyze: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to bulk analyze: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('exam-questions/bulk/process')
  async bulkProcess(@Body() body: BulkAnalyzeDto) {
    try {
      this.logger.log(`Bulk processing ${body.questionIds.length} questions`);
      const result = await this.adminService.bulkProcess(body.questionIds);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to bulk process: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to bulk process: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('exam-questions/bulk/create-replicas')
  async bulkCreateReplicas(@Body() body: BulkAnalyzeDto) {
    try {
      this.logger.log(
        `Bulk creating replicas for ${body.questionIds.length} exam questions`,
      );
      const result = await this.adminService.bulkCreateReplicas(
        body.questionIds,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to bulk create replicas: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to bulk create replicas: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('exam-questions/:id/analyze')
  async triggerAnalysis(
    @Param('id') id: string,
    @Body() body: { lessonId: string },
  ) {
    try {
      const result = await this.adminService.triggerAnalysis(id, body.lessonId);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to trigger analysis for exam question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to trigger analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Delete('exam-questions/:id')
  async deleteExamQuestion(@Param('id') id: string) {
    try {
      const result = await this.adminService.deleteExamQuestion(id);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to delete exam question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to delete exam question: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('exam-questions/:id/knowledge-points')
  async getKnowledgePoints(@Param('id') id: string) {
    try {
      const knowledgePoints = await this.adminService.getKnowledgePoints(id);
      return {
        success: true,
        knowledgePoints,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get knowledge points for exam question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get knowledge points: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('exam-questions/:id/knowledge-points')
  async linkKnowledgePoint(
    @Param('id') id: string,
    @Body() body: LinkKnowledgePointDto,
  ) {
    try {
      const link = await this.adminService.linkKnowledgePoint(
        id,
        body.knowledgePointId,
        body.relationshipType,
      );
      return {
        success: true,
        link,
      };
    } catch (error) {
      this.logger.error(
        `Failed to link knowledge point to exam question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to link knowledge point: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Delete('exam-questions/:id/knowledge-points/:knowledgePointId')
  async unlinkKnowledgePoint(
    @Param('id') id: string,
    @Param('knowledgePointId') knowledgePointId: string,
    @Query('relationshipType')
    relationshipType: 'MEASURED' | 'TRAP' | 'CONTEXT',
  ) {
    try {
      const result = await this.adminService.unlinkKnowledgePoint(
        id,
        knowledgePointId,
        relationshipType,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to unlink knowledge point from exam question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to unlink knowledge point: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('exam-questions/:id/concepts')
  async linkConceptToQuestion(
    @Param('id') id: string,
    @Body() body: { conceptId: string },
  ) {
    try {
      const link = await this.adminService.linkConceptToQuestion(
        id,
        body.conceptId,
      );
      return {
        success: true,
        link,
      };
    } catch (error) {
      this.logger.error(
        `Failed to link concept to exam question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to link concept: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Delete('exam-questions/:id/concepts/:conceptId')
  async unlinkConceptFromQuestion(
    @Param('id') id: string,
    @Param('conceptId') conceptId: string,
  ) {
    try {
      await this.adminService.unlinkConceptFromQuestion(id, conceptId);
      return {
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to unlink concept from exam question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to unlink concept: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  // ============================================
  // SIMILARITY CHECK ENDPOINTS
  // ============================================

  // @Post('exam-questions/check-similarity')
  // async checkSimilarity(
  //   @Body()
  //   body: {
  //     generatedQuestion: {
  //       questionText: string;
  //       spotRule?: string;
  //       topic?: string;
  //       subtopic?: string;
  //       optionAnalysis?: Array<{ wouldBeCorrectIf: string }>;
  //     };
  //     examQuestionId?: string;
  //     lesson?: string;
  //   },
  // ) {
  //   try {
  //     const result = await this.adminService.checkQuestionSimilarity(
  //       body.generatedQuestion,
  //       body.examQuestionId,
  //       body.lesson,
  //     );
  //     return {
  //       success: true,
  //       ...result,
  //     };
  //   } catch (error) {
  //     this.logger.error(
  //       `Failed to check similarity: ${error instanceof Error ? error.message : 'Unknown error'}`,
  //       error instanceof Error ? error.stack : undefined,
  //     );
  //     throw new HttpException(
  //       `Failed to check similarity: ${error instanceof Error ? error.message : 'Unknown error'}`,
  //       500,
  //     );
  //   }
  // }

  @Post('exam-questions/:id/generate-knowledge')
  async generateKnowledge(@Param('id') id: string) {
    try {
      const result =
        await this.adminService.generateKnowledgeFromExamQuestion(id);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate knowledge for exam question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to generate knowledge: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('exam-questions/:id/generate-replica-question')
  async generateQuestion(@Param('id') id: string) {
    try {
      const result =
        await this.adminService.generateQuestionCardFromExamQuestion(id);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate question for exam question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to generate question: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('exam-questions/:id/generated-cards')
  async getGeneratedCardsForExamQuestion(@Param('id') id: string) {
    try {
      const cards =
        await this.adminService.getGeneratedCardsForExamQuestion(id);
      return {
        success: true,
        count: cards.length,
        cards,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get generated cards for exam question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to get generated cards: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  // ============================================
  // PREREQUISITE LEARNING ENDPOINTS
  // ============================================

  @Get('prerequisite-learning/analytics')
  async getPrerequisiteAnalytics() {
    try {
      const analytics = await this.adminService.getPrerequisiteAnalytics();
      return {
        success: true,
        analytics,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get prerequisite analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get prerequisite analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('prerequisite-learning/prerequisites')
  async getAllPrerequisites(@Query() query: PrerequisiteQueryDto) {
    try {
      const result = await this.adminService.getAllPrerequisites(query);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get all prerequisites: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get all prerequisites: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('prerequisite-learning/prerequisites/:id')
  async getPrerequisiteDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PrerequisiteDetailQueryDto,
  ): Promise<PrerequisiteDetailResponseDto> {
    try {
      this.logger.log(`Getting prerequisite detail for ID: ${id}`);
      return await this.adminService.getPrerequisiteDetail(id, query);
    } catch (error) {
      this.logger.error(
        `Failed to get prerequisite detail: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get prerequisite detail: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('prerequisite-learning/prerequisites/:id/review-recommendation')
  async getPrerequisiteReviewRecommendation(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    try {
      const recommendation =
        await this.adminService.getPrerequisiteReviewRecommendation(id);
      return {
        success: true,
        recommendation,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get review recommendation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        error instanceof Error
          ? error.message
          : 'Failed to get review recommendation',
        500,
      );
    }
  }

  @Post('prerequisite-learning/prerequisites/:id/deprecate')
  async deprecatePrerequisite(@Param('id', ParseUUIDPipe) id: string) {
    try {
      await this.adminService.deprecatePrerequisite(id);
      return {
        success: true,
        message: 'Prerequisite deprecated successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to deprecate prerequisite: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        error instanceof Error
          ? error.message
          : 'Failed to deprecate prerequisite',
        500,
      );
    }
  }

  @Post('prerequisite-learning/prerequisites/:id/link-concepts')
  async linkConceptsToPrerequisite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { conceptIds: string[] },
  ) {
    try {
      await this.adminService.linkConceptsToPrerequisite(id, body.conceptIds);
      return {
        success: true,
        message: 'Concepts linked successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to link concepts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to link concepts',
        500,
      );
    }
  }

  @Get('concepts/search')
  async searchConcepts(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const concepts = await this.adminService.searchConcepts(
        query,
        limit ? parseInt(limit) : 20,
      );
      return {
        success: true,
        concepts,
      };
    } catch (error) {
      this.logger.error(
        `Failed to search concepts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to search concepts',
        500,
      );
    }
  }

  @Get('prerequisite-learning/topics')
  async getAllTopicsWithPrerequisites() {
    try {
      const topics = await this.adminService.getAllTopicsWithPrerequisites();
      return {
        success: true,
        topics,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get all topics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get all topics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('prerequisite-learning/topics/:topicName')
  async getTopicPrerequisites(@Param('topicName') topicName: string) {
    try {
      const result = await this.adminService.getTopicPrerequisites(topicName);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get prerequisites for topic ${topicName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get prerequisites for topic: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('prerequisite-learning/prerequisites/:prerequisiteName')
  async getPrerequisiteTopics(
    @Param('prerequisiteName') prerequisiteName: string,
  ) {
    try {
      const result =
        await this.adminService.getPrerequisiteTopics(prerequisiteName);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get topics for prerequisite ${prerequisiteName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get topics for prerequisite: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('prerequisite-learning/process-all')
  async processAllAnalyzedQuestions() {
    try {
      const result = await this.adminService.processAllAnalyzedQuestions();
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process all analyzed questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to process all analyzed questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  // ============================================
  // PREREQUISITE MERGE ENDPOINTS
  // ============================================

  @Post('prerequisite-learning/merge/preview')
  async previewPrerequisiteMerge(@Body() body: MergePreviewDto) {
    try {
      this.logger.log(
        `Previewing merge for ${body.selectedPrerequisiteIds.length} prerequisites`,
      );
      const preview = await this.adminService.previewPrerequisiteMerge(
        body.selectedPrerequisiteIds,
      );
      return {
        success: true,
        ...preview,
      };
    } catch (error) {
      this.logger.error(
        `Failed to preview prerequisite merge: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to preview prerequisite merge: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('prerequisite-learning/merge')
  async mergePrerequisites(@Body() body: MergePrerequisiteDto) {
    try {
      this.logger.log(
        `Merging ${body.selectedPrerequisiteIds.length} prerequisites`,
      );
      const result = await this.adminService.mergePrerequisites(
        body.selectedPrerequisiteIds,
        body.canonicalName,
        body.canonicalPrerequisiteId,
      );
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to merge prerequisites: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to merge prerequisites: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('prerequisite-learning/merge-label-only')
  async mergeLabelOnlyPrerequisite(
    @Body() body: MergeLabelOnlyPrerequisiteDto,
  ) {
    try {
      this.logger.log(
        `Merging LABEL_ONLY prerequisite ${body.prerequisiteId} with ${body.conceptIds.length} concepts`,
      );
      const result = await this.adminService.mergeLabelOnlyPrerequisite(
        body.prerequisiteId,
        body.conceptIds,
        body.adminLabel,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to merge LABEL_ONLY prerequisite: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to merge LABEL_ONLY prerequisite: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('process-analyzed-question/:id')
  async processAnalyzedQuestion(@Param('id') id: string) {
    try {
      const result = await this.adminService.processAnalyzedQuestion(id);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process analyzed question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to process analyzed question: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('prerequisite-learning/topics/:topicName/learning-path')
  async getLearningPathForTopic(@Param('topicName') topicName: string) {
    try {
      const prerequisites =
        await this.adminService.getLearningPathForTopic(topicName);
      return {
        success: true,
        topic: topicName,
        prerequisites,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get learning path for topic ${topicName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get learning path for topic: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('prerequisite-learning/topics/:topicName/context')
  async getPrerequisiteContextForTopic(@Param('topicName') topicName: string) {
    try {
      const context =
        await this.adminService.getPrerequisiteContextForTopic(topicName);
      return {
        success: true,
        topic: topicName,
        context,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get prerequisite context for topic ${topicName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get prerequisite context for topic: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('prerequisite-learning/topics/:topicName/content-generation-check')
  async checkContentGenerationForTopic(@Param('topicName') topicName: string) {
    try {
      const shouldBlock =
        await this.adminService.shouldBlockAdvancedContentGeneration(topicName);
      return {
        success: true,
        topic: topicName,
        shouldBlockAdvancedContentGeneration: shouldBlock,
      };
    } catch (error) {
      this.logger.error(
        `Failed to check content generation for topic ${topicName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to check content generation for topic: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  // ============================================
  // AI TASK CONFIG ENDPOINTS
  // ============================================

  @Get('ai-config')
  async getAllAIConfigs() {
    try {
      const configs = await this.adminService.getAllAITaskConfigs();
      return {
        success: true,
        configs,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get AI configs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get AI configs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('ai-config/:taskType')
  async getAIConfig(@Param('taskType') taskType: AITaskType) {
    try {
      const config = await this.adminService.getAITaskConfig(taskType);
      return {
        success: true,
        config,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get AI config for ${taskType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get AI config: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('ai-config/:taskType')
  async updateAIConfig(
    @Param('taskType') taskType: AITaskType,
    @Body() body: UpdateAITaskConfigDto,
  ) {
    try {
      const config = await this.adminService.updateAITaskConfig(taskType, body);
      return {
        success: true,
        config,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update AI config for ${taskType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to update AI config: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  // ============================================
  // BULK UPLOAD ENDPOINTS
  // ============================================

  @Post('exam-questions/bulk/preview')
  bulkUploadPreview(@Body() body: BulkUploadPreviewDto) {
    try {
      this.logger.log(`Previewing bulk upload for lesson: ${body.lesson}`);
      const result = this.adminService.bulkUploadPreview(
        body.text,
        body.lesson,
      );
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to preview bulk upload: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to preview bulk upload: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('exam-questions/bulk/save')
  async bulkUploadSave(@Body() body: BulkUploadSaveDto) {
    try {
      this.logger.log(`Saving bulk upload for lesson: ${body.lesson}`);
      const result = await this.adminService.bulkUploadSave(
        body.text,
        body.lesson,
        body.year,
        body.examType,
        'admin', // TODO: Get from auth context
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to save bulk upload: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to save bulk upload: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  // ============================================
  // LESSON/TOPIC/SUBTOPIC REGISTRY ENDPOINTS
  // ============================================

  @Get('subtopics/detail/:subtopicId')
  async getSubtopicDetails(@Param('subtopicId') subtopicId: string) {
    try {
      const decodedSubtopic = decodeURIComponent(subtopicId);

      const details =
        await this.adminService.getSubtopicDetails(decodedSubtopic);
      return {
        success: true,
        ...details,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get subtopic details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get subtopic details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('registry/stats')
  async getRegistryStats() {
    try {
      const stats = await this.adminService.getRegistryStats();
      return {
        success: true,
        stats,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get registry stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get registry stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('registry/lessons')
  async getAllLessons() {
    try {
      const lessons = await this.adminService.getAllLessons();
      return {
        success: true,
        lessons,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get lessons: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get lessons: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('registry/lessons/:lessonName/topics')
  async getTopicsForLesson(@Param('lessonName') lessonName: string) {
    try {
      const topics = await this.adminService.getTopicsForLesson(lessonName);
      return {
        success: true,
        topics,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get topics for lesson ${lessonName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get topics for lesson: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('registry/lessons/:lessonName/topics/:topicName/subtopics')
  async getSubtopicsForTopic(
    @Param('lessonName') lessonName: string,
    @Param('topicName') topicName: string,
  ) {
    try {
      const subtopics = await this.adminService.getSubtopicsForTopic(
        topicName,
        lessonName,
      );
      return {
        success: true,
        subtopics,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get subtopics for topic ${topicName} (${lessonName}): ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get subtopics for topic: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  // ============================================
  // EXAM INTELLIGENCE ENDPOINTS
  // ============================================

  @Get('exam-intelligence/report')
  async getExamIntelligenceReport(
    @Query('lesson') lesson?: string,
    @Query('startYear') startYear?: string,
    @Query('endYear') endYear?: string,
  ) {
    try {
      const parsedStart = startYear ? Number(startYear) : undefined;
      const parsedEnd = endYear ? Number(endYear) : undefined;
      let safeStart = Number.isFinite(parsedStart) ? parsedStart : undefined;
      let safeEnd = Number.isFinite(parsedEnd) ? parsedEnd : undefined;
      if (safeStart && safeEnd && safeStart > safeEnd) {
        [safeStart, safeEnd] = [safeEnd, safeStart];
      }
      this.logger.log(
        `Generating exam intelligence report${lesson ? ` for lesson: ${lesson}` : ''}`,
      );
      const report =
        await this.examIntelligenceService.generateIntelligenceReport(
          lesson,
          safeStart,
          safeEnd,
        );
      return {
        success: true,
        report,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate intelligence report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to generate intelligence report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  // ============================================
  // ONTOLOGY RESOLUTION ENDPOINTS
  // ============================================

  @Get('ontology/unmatched-suggestions')
  async getUnmatchedOntologySuggestions(
    @Query('lessonId') lessonId?: string,
    @Query('minOccurrences') minOccurrences?: string,
  ) {
    try {
      const suggestions =
        await this.adminService.getUnmatchedOntologySuggestions({
          lessonId,
          minOccurrences: minOccurrences ? parseInt(minOccurrences) : 1,
        });
      return {
        success: true,
        suggestions,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get unmatched suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get unmatched suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('exam-questions/:id/resolve-ontology')
  async resolveOntologyMismatches(
    @Param('id') id: string,
    @Body()
    body: {
      topicId?: string;
      subtopicId?: string;
      conceptIds?: string[];
      action: 'APPROVE_AS_IS' | 'REJECT_SUGGESTIONS' | 'RESOLVE';
    },
  ) {
    try {
      const result = await this.adminService.resolveOntologyMismatches(
        id,
        body,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to resolve ontology for question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to resolve ontology: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('ontology/create')
  async createOntologyEntity(@Body() body: CreateOntologyEntityDto) {
    try {
      const result = await this.adminService.createOntologyEntity(body);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create ontology entity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to create ontology entity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  // =====================
  // Generated Questions
  // =====================

  @Get('generated-questions')
  async listGeneratedQuestions(
    @Query('status') status?: string,
    @Query('lessonId') lessonId?: string,
    @Query('topicId') topicId?: string,
    @Query('subtopicId') subtopicId?: string,
    @Query('prerequisiteId') prerequisiteId?: string,
    @Query('sourceType') sourceType?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    try {
      const result = await this.adminService.listGeneratedQuestions({
        status,
        lessonId,
        topicId,
        subtopicId,
        prerequisiteId,
        sourceType,
        limit: limit ? parseInt(limit) : undefined,
        page: page ? parseInt(page) : undefined,
      });
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to list generated questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to list generated questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('generated-questions/:id')
  async getGeneratedQuestion(@Param('id', ParseUUIDPipe) id: string) {
    try {
      const question = await this.adminService.getGeneratedQuestion(id);
      return {
        success: true,
        question,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get generated question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to get generated question: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('generated-questions/:id/approve')
  async approveGeneratedQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { approvedBy: string },
  ) {
    try {
      const question = await this.adminService.approveGeneratedQuestion(
        id,
        body.approvedBy,
      );
      return {
        success: true,
        message: 'Question approved successfully',
        question,
      };
    } catch (error) {
      this.logger.error(
        `Failed to approve generated question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to approve question: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('generated-questions/:id/reject')
  async rejectGeneratedQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { rejectedBy: string; reason?: string },
  ) {
    try {
      const question = await this.adminService.rejectGeneratedQuestion(
        id,
        body.rejectedBy,
        body.reason,
      );
      return {
        success: true,
        message: 'Question rejected successfully',
        question,
      };
    } catch (error) {
      this.logger.error(
        `Failed to reject generated question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to reject question: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('generated-questions/:id/edit')
  async editGeneratedQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      question?: string;
      options?: Record<string, string>;
      correctAnswer?: string;
      explanation?: string;
      editedBy: string;
    },
  ) {
    try {
      const question = await this.adminService.editGeneratedQuestion(id, body);
      return {
        success: true,
        message: 'Question edited successfully',
        question,
      };
    } catch (error) {
      this.logger.error(
        `Failed to edit generated question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to edit question: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Delete('generated-questions/:id')
  async deleteGeneratedQuestion(@Param('id', ParseUUIDPipe) id: string) {
    try {
      await this.adminService.deleteGeneratedQuestion(id);
      return {
        success: true,
        message: 'Question deleted successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete generated question ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to delete question: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('generated-questions/bulk/delete')
  async bulkDeleteGeneratedQuestions(@Body() body: { questionIds: string[] }) {
    try {
      this.logger.log(
        `Bulk deleting ${body.questionIds.length} generated questions`,
      );
      const result = await this.adminService.bulkDeleteGeneratedQuestions(
        body.questionIds,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to bulk delete generated questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to bulk delete questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Post('concepts')
  async createConceptFromPrerequisite(
    @Body()
    body: {
      preferredLabel: string;
      conceptType: string;
      definition?: string;
      aliases?: string[];
      prerequisiteId: string;
    },
  ) {
    try {
      const concept =
        await this.adminService.createConceptFromPrerequisite(body);
      return {
        success: true,
        message: 'Concept created successfully',
        concept,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create concept: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to create concept',
        500,
      );
    }
  }

  @Patch('prerequisites/:id')
  async updatePrerequisite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { name?: string; canonicalKey?: string; notes?: string },
  ) {
    try {
      const prerequisite = await this.adminService.updatePrerequisite(id, body);
      return {
        success: true,
        message: 'Prerequisite updated successfully',
        prerequisite,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update prerequisite: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        error instanceof Error
          ? error.message
          : 'Failed to update prerequisite',
        500,
      );
    }
  }

  @Post('prerequisites/:id/merge')
  async mergePrerequisitePair(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { targetPrerequisiteId: string },
  ) {
    try {
      await this.adminService.mergePrerequisitePair(
        id,
        body.targetPrerequisiteId,
      );
      return {
        success: true,
        message: 'Prerequisites merged successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to merge prerequisites: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        error instanceof Error
          ? error.message
          : 'Failed to merge prerequisites',
        500,
      );
    }
  }

  @Get('prerequisites/search')
  async searchPrerequisites(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const prerequisites = await this.adminService.searchPrerequisites(
        query,
        limit ? parseInt(limit) : 20,
      );
      return {
        success: true,
        prerequisites,
      };
    } catch (error) {
      this.logger.error(
        `Failed to search prerequisites: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        error instanceof Error
          ? error.message
          : 'Failed to search prerequisites',
        500,
      );
    }
  }

  @Post('concepts/:id/reprocess-questions')
  async reprocessQuestionsForConcept(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      dryRun?: boolean;
      maxQuestions?: number;
    },
  ) {
    try {
      const result = await this.adminService.reprocessQuestionsForConcept(
        id,
        body,
      );
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to reprocess questions for concept ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        error instanceof Error
          ? error.message
          : 'Failed to reprocess questions',
        500,
      );
    }
  }

  @Get('concepts/:id/unresolved-hints')
  async getUnresolvedHintsForConcept(@Param('id', ParseUUIDPipe) id: string) {
    try {
      const count = await this.adminService.getUnresolvedHintsForConcept(id);
      return {
        success: true,
        count,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get unresolved hints for concept ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        error instanceof Error
          ? error.message
          : 'Failed to get unresolved hints',
        500,
      );
    }
  }

  @Post('topics/validate')
  async validateTopicOrSubtopic(
    @Body()
    body: {
      lessonId: string;
      proposedName: string;
      parentTopicId?: string;
    },
  ) {
    try {
      const result = await this.adminService.validateTopicOrSubtopic(body);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to validate topic/subtopic: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  @Post('topics')
  async createTopic(
    @Body()
    body: {
      lessonId: string;
      name: string;
      displayName?: string;
    },
  ) {
    try {
      const topic = await this.adminService.createTopic(body);
      return {
        success: true,
        topic,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create topic: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  @Post('subtopics')
  async createSubtopic(
    @Body()
    body: {
      topicId: string;
      name: string;
      displayName?: string;
    },
  ) {
    try {
      const subtopic = await this.adminService.createSubtopic(body);
      return {
        success: true,
        subtopic,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create subtopic: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // ============================================
  // SPATIAL ANATOMY ANALYTICS ENDPOINTS
  // ============================================

  /**
   * Get spatial anatomy analytics
   * Returns performance by anatomy region/concept
   */
  @Get('analytics/spatial-anatomy')
  async getSpatialAnatomyAnalytics(
    @Query('lessonId') lessonId?: string,
    @Query('minAttempts') minAttempts?: string,
  ) {
    try {
      const result = await this.adminService.getSpatialAnatomyAnalytics({
        lessonId,
        minAttempts: minAttempts ? parseInt(minAttempts, 10) : undefined,
      });
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get spatial anatomy analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        `Failed to get spatial anatomy analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  /**
   * Get user spatial weaknesses
   * Returns anatomy regions where user struggles
   */
  @Get('analytics/spatial-weaknesses/:userId')
  async getUserSpatialWeaknesses(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const result = await this.adminService.getUserSpatialWeaknesses(
        userId,
        limit ? parseInt(limit, 10) : undefined,
      );
      return {
        success: true,
        weaknesses: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user spatial weaknesses: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        `Failed to get user spatial weaknesses: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  /**
   * Get prerequisite-spatial correlations
   * Shows which anatomy regions are linked to which prerequisites
   */
  @Get('analytics/prerequisite-spatial')
  async getPrerequisiteSpatialCorrelations(
    @Query('prerequisiteId') prerequisiteId?: string,
    @Query('lessonId') lessonId?: string,
  ) {
    try {
      const result = await this.adminService.getPrerequisiteSpatialCorrelations(
        {
          prerequisiteId,
          lessonId,
        },
      );
      return {
        success: true,
        correlations: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get prerequisite-spatial correlations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        `Failed to get prerequisite-spatial correlations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }
}
