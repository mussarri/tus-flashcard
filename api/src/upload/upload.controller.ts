import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  UseInterceptors,
  UploadedFiles,
  Param,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { memoryStorage } from 'multer';

@Controller('api/upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly uploadService: UploadService) {}

  @Post('batch')
  async createBatch(@Body() createBatchDto: CreateBatchDto) {
    try {
      this.logger.log(`Creating batch with topic: ${createBatchDto.topic}`);

      // TODO: Get actual admin user ID from auth
      const createdBy = 'admin-user-id';

      const batch = await this.uploadService.createBatch(
        createBatchDto.topic,
        createBatchDto.description,
        createdBy,
        createBatchDto.contentTypeHint,
        createBatchDto.visionProvider,
      );

      this.logger.log(`Batch created successfully: ${batch.id}`);

      return {
        success: true,
        batch: {
          id: batch.id,
          topic: batch.topic,
          status: batch.status,
          createdAt: batch.createdAt,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to create batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Post('batch/:batchId/files')
  @UseInterceptors(
    FilesInterceptor('files', 50, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }) as any,
  )
  async uploadFiles(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      this.logger.log(
        `Uploading files for batch: ${batchId}, file count: ${files?.length || 0}`,
      );

      if (!files || files.length === 0) {
        this.logger.warn(`No files provided for batch: ${batchId}`);
        return {
          success: false,
          error: 'No files provided',
        };
      }

      // TODO: Get actual admin user ID from auth
      const createdBy = 'admin-user-id';

      const result = await this.uploadService.processBatchUpload(
        batchId,
        files,
        createdBy,
      );

      this.logger.log(
        `Files uploaded successfully for batch: ${batchId}, pages created: ${result.pagesCreated}`,
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload files for batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Get('batch/:batchId')
  async getBatch(@Param('batchId', ParseUUIDPipe) batchId: string) {
    try {
      this.logger.log(`Getting batch: ${batchId}`);
      const batch = await this.uploadService.getBatch(batchId);

      if (!batch) {
        this.logger.warn(`Batch not found: ${batchId}`);
      } else {
        this.logger.log(`Batch retrieved successfully: ${batchId}`);
      }

      return {
        success: true,
        batch,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Get('batches')
  async getAllBatches() {
    try {
      this.logger.log('Getting all batches');
      const batches = await this.uploadService.getAllBatches();
      this.logger.log(`Retrieved ${batches.length} batches`);

      return {
        success: true,
        batches,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get all batches: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Post('batch/:batchId/pages')
  @UseInterceptors(
    FilesInterceptor('files', 50, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }) as any,
  )
  async addPagesToBatch(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      this.logger.log(
        `Adding pages to batch: ${batchId}, file count: ${files?.length || 0}`,
      );

      if (!files || files.length === 0) {
        this.logger.warn(`No files provided for batch: ${batchId}`);
        return {
          success: false,
          error: 'No files provided',
        };
      }

      const result = await this.uploadService.addPagesToBatch(batchId, files);

      this.logger.log(
        `Pages added successfully to batch: ${batchId}, pages created: ${result.pagesCreated}`,
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to add pages to batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Delete('batch/:batchId')
  async deleteBatch(@Param('batchId', ParseUUIDPipe) batchId: string) {
    try {
      this.logger.log(`Deleting batch: ${batchId}`);
      await this.uploadService.deleteBatch(batchId);
      this.logger.log(`Batch deleted successfully: ${batchId}`);

      return {
        success: true,
        message: 'Batch deleted successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Patch('batch/:batchId')
  async updateBatch(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() updateBatchDto: UpdateBatchDto,
  ) {
    try {
      this.logger.log(`Updating batch: ${batchId}`);
      const batch = await this.uploadService.updateBatch(
        batchId,
        updateBatchDto,
      );
      this.logger.log(`Batch updated successfully: ${batchId}`);

      return {
        success: true,
        batch,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
