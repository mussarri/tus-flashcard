/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from '../queue/queues';
import { ContentType } from '@prisma/client';
import { StateMachineValidator } from '../common/validators/state-machine.validator';

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QueueName.KNOWLEDGE_EXTRACTION)
    private readonly knowledgeExtractionQueue: Queue,
  ) {}

  async approveBlock(blockId: string, approvedBy: string, editedText?: string) {
    try {
      this.logger.debug(`Approving block: ${blockId}, edited: ${!!editedText}`);

      const block = await this.prisma.parsedBlock.findUnique({
        where: { id: blockId },
        include: { page: { include: { batch: true } } },
      });

      if (!block) {
        this.logger.warn(`Block not found: ${blockId}`);
        throw new NotFoundException(`Block ${blockId} not found`);
      }

      // Update block
      const updateData = {
        approvalStatus: 'APPROVED' as const,
        approvedAt: new Date(),
        approvedBy,
        editedText: block.rawText,
      };

      if (editedText && editedText !== block.rawText) {
        Object.assign(updateData, {
          editedText,
          isEdited: true,
        });
        this.logger.debug(`Block ${blockId} was edited`);
      } else {
        Object.assign(updateData, {
          editedText: block.rawText || editedText,
        });
      }

      await this.prisma.parsedBlock.update({
        where: { id: blockId },
        data: updateData,
      });

      // Check if ApprovedContent already exists for this block
      let approvedContent = await this.prisma.approvedContent.findUnique({
        where: { blockId },
      });

      if (!approvedContent) {
        // Create ApprovedContent record
        approvedContent = await this.prisma.approvedContent.create({
          data: {
            batchId: block.page.batchId,
            blockId,
            content: updateData.editedText as string,
            blockType: block.blockType || 'TEXT', // Use blockType if available, default to TEXT
            extractionStatus: 'NOT_STARTED', // Manual extraction - admin must trigger
          },
        });
        this.logger.debug(
          `Created new ApprovedContent: ${approvedContent.id} (extractionStatus: NOT_STARTED)`,
        );
      } else {
        // Update existing ApprovedContent if content changed
        if (approvedContent.content !== updateData.editedText) {
          const currentStatus = approvedContent.extractionStatus;
          const shouldReset =
            currentStatus === 'COMPLETED' ||
            currentStatus === 'PROCESSING' ||
            currentStatus === 'QUEUED';

          approvedContent = await this.prisma.approvedContent.update({
            where: { id: approvedContent.id },
            data: {
              content: updateData.editedText as string,
              // Reset extraction status if content changed and was already processed
              extractionStatus: shouldReset ? 'NOT_STARTED' : currentStatus,
            },
          });
          this.logger.debug(`Updated ApprovedContent: ${approvedContent.id}`);
        }
      }

      // NOTE: Knowledge extraction is now MANUAL ONLY
      // Admin must trigger extraction via /admin/approved-contents/:id/extract-knowledge
      // or /admin/batches/:id/extract-knowledge endpoints

      this.logger.log(
        `Block approved successfully: ${blockId}, approvedContent: ${approvedContent.id}`,
      );

      // Recalculate batch status after approval
      await this.recalculateBatchStatus(block.page.batchId);

      return approvedContent;
    } catch (error) {
      this.logger.error(
        `Failed to approve block ${blockId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async rejectBlock(blockId: string, approvedBy: string) {
    try {
      this.logger.debug(`Rejecting block: ${blockId}`);

      const block = await this.prisma.parsedBlock.findUnique({
        where: { id: blockId },
        include: { page: true },
      });

      if (!block) {
        this.logger.warn(`Block not found: ${blockId}`);
        throw new NotFoundException(`Block ${blockId} not found`);
      }

      await this.prisma.parsedBlock.update({
        where: { id: blockId },
        data: {
          approvalStatus: 'REJECTED',
          approvedAt: new Date(),
          approvedBy,
        },
      });

      this.logger.log(`Block rejected successfully: ${blockId}`);

      // Recalculate batch status after rejection
      await this.recalculateBatchStatus(block.page.batchId);

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to reject block ${blockId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async deleteBlock(blockId: string, approvedBy: string) {
    try {
      this.logger.debug(`Deleting block: ${blockId}`);

      const block = await this.prisma.parsedBlock.findUnique({
        where: { id: blockId },
        include: { page: true },
      });

      if (!block) {
        this.logger.warn(`Block not found: ${blockId}`);
        throw new NotFoundException(`Block ${blockId} not found`);
      }

      await this.prisma.parsedBlock.update({
        where: { id: blockId },
        data: {
          approvalStatus: 'DELETED',
          deletedAt: new Date(),
          approvedBy,
        },
      });

      this.logger.log(`Block deleted successfully: ${blockId}`);

      // Recalculate batch status after deletion
      await this.recalculateBatchStatus(block.page.batchId);

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to delete block ${blockId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Recalculate and update batch status based on current state
   */
  async recalculateBatchStatus(batchId: string): Promise<void> {
    try {
      this.logger.debug(`Recalculating batch status for: ${batchId}`);

      const batch = await this.prisma.uploadBatch.findUnique({
        where: { id: batchId },
        include: {
          pages: {
            include: {
              blocks: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      });

      if (!batch) {
        this.logger.warn(`Batch not found: ${batchId}`);
        return;
      }

      // Count blocks by status
      const allBlocks = batch.pages.flatMap((page) => page.blocks);
      const totalBlocks = allBlocks.length;
      const pendingBlocks = allBlocks.filter(
        (b) => b.approvalStatus === 'PENDING',
      ).length;
      const approvedBlocks = allBlocks.filter(
        (b) => b.approvalStatus === 'APPROVED',
      ).length;
      const rejectedBlocks = allBlocks.filter(
        (b) => b.approvalStatus === 'REJECTED',
      ).length;
      const deletedBlocks = allBlocks.filter(
        (b) => b.approvalStatus === 'DELETED',
      ).length;

      // Check if all pages are parsed
      const allPagesParsed = batch.pages.every(
        (p) => p.ocrStatus === 'COMPLETED' || p.ocrStatus === 'FAILED',
      );

      // Determine new status based on state machine
      let newStatus = batch.status;

      // If all pages are parsed and batch is PENDING/PROCESSING, set to UPLOADED
      if (
        allPagesParsed &&
        (batch.status === 'PENDING' || batch.status === 'PROCESSING')
      ) {
        newStatus = 'UPLOADED';
      }

      // If batch is UPLOADED and has classified blocks, set to CLASSIFIED
      if (batch.status === 'UPLOADED' && totalBlocks > 0) {
        const allClassified = allBlocks.every(
          (b) =>
            b.classificationStatus === 'CLASSIFIED' ||
            b.classificationStatus === 'FAILED',
        );
        if (allClassified) {
          newStatus = 'CLASSIFIED';
        }
      }

      // If batch is CLASSIFIED and has blocks ready for review, set to REVIEWED
      if (
        (batch.status === 'CLASSIFIED' || batch.status === 'UPLOADED') &&
        totalBlocks > 0 &&
        pendingBlocks > 0
      ) {
        newStatus = 'REVIEWED';
      }

      // If all blocks are reviewed (approved, rejected, or deleted), check if knowledge extracted
      const reviewedBlocks = approvedBlocks + rejectedBlocks + deletedBlocks;
      if (totalBlocks > 0 && reviewedBlocks === totalBlocks) {
        // Check if knowledge extraction is completed for all approved content
        const approvedContents = await this.prisma.approvedContent.findMany({
          where: { batchId },
        });
        const allExtracted = approvedContents.every(
          (ac) =>
            ac.extractionStatus === 'COMPLETED' ||
            ac.extractionStatus === 'VERIFIED',
        );
        if (approvedContents.length > 0 && allExtracted) {
          newStatus = 'KNOWLEDGE_EXTRACTED';
        } else if (approvedContents.length === 0) {
          // No approved content, can't extract knowledge
          newStatus = 'COMPLETED';
        }
      }

      // Update status if changed (with state machine validation)
      if (newStatus !== batch.status) {
        try {
          // Validate state transition
          StateMachineValidator.validateBatchTransition(
            batch.status,
            newStatus,
          );

          await this.prisma.uploadBatch.update({
            where: { id: batchId },
            data: { status: newStatus },
          });

          this.logger.log(
            `Batch status updated: ${batchId}, ${batch.status} → ${newStatus}`,
          );
        } catch (error) {
          this.logger.warn(
            `Invalid batch state transition attempted: ${batchId}, ${batch.status} → ${newStatus}. Error: ${error instanceof Error ? error.message : 'Unknown'}`,
          );
          // Don't throw - just log the warning
        }
      } else {
        this.logger.debug(
          `Batch status unchanged: ${batchId}, status: ${batch.status}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to recalculate batch status for ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't throw - this is a helper method
    }
  }

  async getBatchForReview(batchId: string) {
    try {
      this.logger.debug(`Getting batch for review: ${batchId}`);

      const batch = await this.prisma.uploadBatch.findUnique({
        where: { id: batchId },
        include: {
          pages: {
            include: {
              blocks: {
                where: {
                  approvalStatus: {
                    in: ['PENDING', 'APPROVED', 'REJECTED'],
                  },
                  deletedAt: null,
                },
                orderBy: { blockIndex: 'asc' },
              },
            },
            orderBy: { pageNumber: 'asc' },
          },
        },
      });

      if (!batch) {
        this.logger.warn(`Batch not found: ${batchId}`);
        throw new NotFoundException(`Batch ${batchId} not found`);
      }

      // If batch is PARSED, automatically transition to REVIEWING when admin opens review
      // Update batch status to REVIEWED if it's UPLOADED or CLASSIFIED
      if (batch.status === 'UPLOADED' || batch.status === 'CLASSIFIED') {
        try {
          StateMachineValidator.validateBatchTransition(
            batch.status,
            'REVIEWED',
          );
          await this.prisma.uploadBatch.update({
            where: { id: batchId },
            data: { status: 'REVIEWED' },
          });
          this.logger.log(
            `Batch status updated to REVIEWED: ${batchId} (admin opened review)`,
          );
        } catch (error) {
          this.logger.warn(
            `Invalid state transition for batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown'}`,
          );
        }
      }

      const totalBlocks = batch.pages.reduce(
        (sum, page) => sum + page.blocks.length,
        0,
      );
      this.logger.debug(
        `Batch retrieved: ${batchId}, pages: ${batch.pages.length}, blocks: ${totalBlocks}`,
      );

      // Return updated batch
      const updatedBatch = await this.prisma.uploadBatch.findUnique({
        where: { id: batchId },
        include: {
          pages: {
            include: {
              blocks: {
                where: {
                  approvalStatus: {
                    in: ['PENDING', 'APPROVED', 'REJECTED'],
                  },
                  deletedAt: null,
                },
                orderBy: { blockIndex: 'asc' },
              },
            },
            orderBy: { pageNumber: 'asc' },
          },
        },
      });

      return updatedBatch || batch;
    } catch (error) {
      this.logger.error(
        `Failed to get batch for review ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async getApprovedBlocks(batchId: string) {
    try {
      this.logger.debug(`Getting approved blocks for batch: ${batchId}`);

      const approvedBlocks = await this.prisma.approvedContent.findMany({
        where: { batchId },
        include: {
          block: {
            include: {
              page: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      this.logger.debug(
        `Retrieved ${approvedBlocks.length} approved blocks for batch: ${batchId}`,
      );
      return approvedBlocks;
    } catch (error) {
      this.logger.error(
        `Failed to get approved blocks for batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async createManualBlock(
    pageId: string,
    rawText: string,
    contentType: ContentType,
    createdBy: string,
    lesson?: string,
    topic?: string,
    subtopic?: string,
  ) {
    try {
      this.logger.debug(`Creating manual block for page: ${pageId}`);

      // Verify page exists
      const page = await this.prisma.uploadPage.findUnique({
        where: { id: pageId },
        include: { blocks: true },
      });

      if (!page) {
        throw new NotFoundException(`Page ${pageId} not found`);
      }

      // Get next block index
      const nextBlockIndex = page.blocks.length;

      const lessonId = lesson
        ? await this.prisma.lesson
            .findFirst({
              where: { name: lesson },
            })
            .then((l) => l?.id)
        : undefined;

      const topicId = topic
        ? await this.prisma.topic
            .findFirst({
              where: {
                name: topic,
                lessonId: lessonId || undefined,
              },
            })
            .then((t) => t?.id)
        : undefined;

      const subtopicId = subtopic
        ? await this.prisma.subtopic
            .findFirst({
              where: {
                name: subtopic,
                lessonId: lessonId || undefined,
                topicId: topicId || undefined,
              },
            })
            .then((st) => st?.id)
        : undefined;

      if (!lessonId) {
        throw new NotFoundException(`Lesson ${lesson} not found`);
      }

      // Create the block
      const block = await this.prisma.parsedBlock.create({
        data: {
          pageId,
          contentType,
          rawText,
          lessonId,
          topicId,
          subtopicId,
          blockIndex: nextBlockIndex,
          confidence: 1.0, // Manual entry = 100% confidence
          classificationStatus: 'CLASSIFIED',
          approvalStatus: 'PENDING',
          questions: [],
          importantFacts: [],
        },
      });

      this.logger.log(
        `Manual block created successfully: ${block.id} for page ${pageId}`,
      );

      return block;
    } catch (error) {
      this.logger.error(
        `Failed to create manual block for page ${pageId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
