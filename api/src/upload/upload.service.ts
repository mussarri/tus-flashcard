import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from '../queue/queues';
import { UploadPage } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UpdateBatchDto } from './dto/update-batch.dto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue(QueueName.VISION) private readonly visionQueue: Queue,
  ) {
    this.uploadDir =
      this.configService.get<string>('UPLOAD_DIR') || './uploads';
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadDir);
      this.logger.log(`Upload directory exists: ${this.uploadDir}`);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  async createBatch(
    topic: string,
    description: string | undefined,
    createdBy: string,
    contentTypeHint?: string,
    visionProvider?: string,
  ) {
    try {
      this.logger.log(
        `Creating batch: ${topic}${contentTypeHint ? `, contentType: ${contentTypeHint}` : ''}${visionProvider ? `, vision provider: ${visionProvider}` : ''}`,
      );
      const batch = await this.prisma.uploadBatch.create({
        data: {
          topic,
          description,
          createdBy,
          contentTypeHint: contentTypeHint as any,
          visionProvider: visionProvider as any,
          status: 'PENDING',
        },
      });
      this.logger.log(`Batch created: ${batch.id}`);
      return batch;
    } catch (error) {
      this.logger.error(
        `Failed to create batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async saveFile(
    file: Express.Multer.File,
    batchId: string,
    pageNumber: number,
  ): Promise<string> {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = `${batchId}-${pageNumber}-${uuidv4()}${fileExtension}`;
      const filePath = path.join(this.uploadDir, fileName);

      this.logger.debug(
        `Saving file: ${file.originalname} to ${filePath} (size: ${file.size} bytes)`,
      );
      await fs.writeFile(filePath, file.buffer);
      this.logger.debug(`File saved successfully: ${filePath}`);

      return filePath;
    } catch (error) {
      this.logger.error(
        `Failed to save file ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async createPage(
    batchId: string,
    pageNumber: number,
    filePath: string,
    originalName: string,
    fileType: 'IMAGE' | 'PDF',
    width?: number,
    height?: number,
  ) {
    return this.prisma.uploadPage.create({
      data: {
        batchId,
        pageNumber,
        filePath,
        originalName,
        fileType,
        width,
        height,
        ocrStatus: 'PENDING',
      },
    });
  }

  async addPagesToBatch(batchId: string, files: Express.Multer.File[]) {
    try {
      this.logger.log(
        `Adding pages to batch: ${batchId}, files: ${files.length}`,
      );

      // Check if batch exists
      const batch = await this.prisma.uploadBatch.findUnique({
        where: { id: batchId },
        include: {
          pages: {
            orderBy: { pageNumber: 'desc' },
            take: 1,
          },
        },
      });

      if (!batch) {
        throw new BadRequestException(`Batch ${batchId} not found`);
      }

      // Get the last page number to continue numbering
      const lastPageNumber =
        batch.pages.length > 0 ? batch.pages[0].pageNumber : 0;

      return await this.processBatchUpload(
        batchId,
        files,
        batch.createdBy,
        lastPageNumber,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add pages to batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async processBatchUpload(
    batchId: string,
    files: Express.Multer.File[],
    createdBy: string,
    startPageNumber: number = 0,
  ) {
    try {
      this.logger.log(
        `Processing batch upload: ${batchId}, files: ${files.length}, startPageNumber: ${startPageNumber}`,
      );

      // Validate files
      if (!files || files.length === 0) {
        throw new BadRequestException('No files provided');
      }

      const maxFileSize = parseInt(
        this.configService.get<string>('MAX_FILE_SIZE') || '10485760',
      );
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/pdf',
      ];

      // Validate each file
      for (const file of files) {
        if (file.size > maxFileSize) {
          this.logger.error(
            `File ${file.originalname} exceeds maximum size: ${file.size} > ${maxFileSize}`,
          );
          throw new BadRequestException(
            `File ${file.originalname} exceeds maximum size of ${maxFileSize} bytes`,
          );
        }

        if (!allowedMimeTypes.includes(file.mimetype)) {
          this.logger.error(
            `File ${file.originalname} has unsupported MIME type: ${file.mimetype}`,
          );
          throw new BadRequestException(
            `File ${file.originalname} has unsupported MIME type: ${file.mimetype}`,
          );
        }
      }

      this.logger.log(`All ${files.length} files validated successfully`);

      // Update batch status to PROCESSING if it's PENDING
      const batch = await this.prisma.uploadBatch.findUnique({
        where: { id: batchId },
      });

      if (batch && batch.status === 'PENDING') {
        await this.prisma.uploadBatch.update({
          where: { id: batchId },
          data: { status: 'PROCESSING' },
        });
        this.logger.log(`Batch ${batchId} status updated to PROCESSING`);
      }

      // Create pages and queue Vision jobs
      const pages: UploadPage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const pageNumber = startPageNumber + i + 1;

        try {
          // Determine file type
          const fileType = file.mimetype.startsWith('image/') ? 'IMAGE' : 'PDF';
          this.logger.debug(
            `Processing file ${pageNumber}/${files.length}: ${file.originalname} (${fileType})`,
          );

          // Save file
          const filePath = await this.saveFile(file, batchId, pageNumber);

          // Create page record
          const page = await this.createPage(
            batchId,
            pageNumber,
            filePath,
            file.originalname,
            fileType,
          );

          pages.push(page);
          this.logger.debug(
            `Page created: ${page.id} for file ${file.originalname}`,
          );

          // Queue Vision job
          const job = await this.visionQueue.add(
            'process-page',
            {
              pageId: page.id,
              filePath,
              fileType,
            },
            {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
            },
          );

          this.logger.log(
            `Vision job queued for page ${page.id}: job ${job.id}`,
          );

          // Update page with job ID
          await this.prisma.uploadPage.update({
            where: { id: page.id },
            data: { ocrJobId: job.id, ocrStatus: 'QUEUED' },
          });
        } catch (error) {
          this.logger.error(
            `Failed to process file ${file.originalname} (${pageNumber}/${files.length}): ${error instanceof Error ? error.message : 'Unknown error'}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw error;
        }
      }

      this.logger.log(
        `Batch upload completed: ${batchId}, pages created: ${pages.length}`,
      );

      return {
        batchId,
        pagesCreated: pages.length,
        pages: pages.map((p) => ({
          id: p.id,
          pageNumber: p.pageNumber,
          originalName: p.originalName,
          ocrStatus: p.ocrStatus,
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to process batch upload ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async getBatch(batchId: string) {
    try {
      this.logger.debug(`Getting batch: ${batchId}`);
      const batch = await this.prisma.uploadBatch.findUnique({
        where: { id: batchId },
        include: {
          pages: {
            include: {
              blocks: {
                orderBy: { blockIndex: 'asc' },
              },
            },
            orderBy: { pageNumber: 'asc' },
          },
        },
      });

      if (!batch) {
        this.logger.warn(`Batch not found: ${batchId}`);
      } else {
        this.logger.debug(
          `Batch retrieved: ${batchId}, pages: ${batch.pages.length}`,
        );
      }

      return batch;
    } catch (error) {
      this.logger.error(
        `Failed to get batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async getAllBatches() {
    try {
      this.logger.debug('Getting all batches');
      const batches = await this.prisma.uploadBatch.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          pages: {
            select: {
              id: true,
              pageNumber: true,
              ocrStatus: true,
              _count: {
                select: { blocks: true },
              },
            },
          },
        },
      });

      this.logger.debug(`Retrieved ${batches.length} batches`);
      return batches;
    } catch (error) {
      this.logger.error(
        `Failed to get all batches: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async deleteBatch(batchId: string): Promise<void> {
    try {
      this.logger.log(`Deleting batch: ${batchId}`);

      // Check if batch exists
      const batch = await this.prisma.uploadBatch.findUnique({
        where: { id: batchId },
        include: {
          pages: {
            select: {
              id: true,
              filePath: true,
            },
          },
        },
      });

      if (!batch) {
        throw new Error(`Batch ${batchId} not found`);
      }

      // Delete uploaded files
      for (const page of batch.pages) {
        if (page.filePath) {
          try {
            await fs.unlink(page.filePath);
            this.logger.debug(`Deleted file: ${page.filePath}`);
          } catch (fileError) {
            // Log but don't fail if file doesn't exist
            this.logger.warn(
              `Failed to delete file ${page.filePath}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
            );
          }
        }
      }

      // Delete batch (cascade will delete pages, blocks, etc.)
      await this.prisma.uploadBatch.delete({
        where: { id: batchId },
      });

      this.logger.log(`Batch deleted successfully: ${batchId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async updateBatch(batchId: string, updateBatchDto: UpdateBatchDto) {
    try {
      const { topic, description } = updateBatchDto;

      if (topic === undefined && description === undefined) {
        throw new BadRequestException('No fields provided for update');
      }

      const batch = await this.prisma.uploadBatch.findUnique({
        where: { id: batchId },
      });

      if (!batch) {
        throw new NotFoundException(`Batch ${batchId} not found`);
      }

      return await this.prisma.uploadBatch.update({
        where: { id: batchId },
        data: {
          ...(topic !== undefined ? { topic } : {}),
          ...(description !== undefined ? { description } : {}),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
