/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisionService, VisionParseResponse } from './vision.service';
import * as fs from 'fs/promises';
import { StateMachineValidator } from '../common/validators/state-machine.validator';

interface VisionJobData {
  pageId: string;
  filePath: string;
  fileType: 'IMAGE' | 'PDF';
}

@Processor('vision')
export class VisionProcessor extends WorkerHost {
  private readonly logger = new Logger(VisionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly visionService: VisionService,
  ) {
    super();
  }

  async process(job: Job<VisionJobData>) {
    const { pageId, filePath, fileType } = job.data;

    this.logger.log(`Processing Vision job for page ${pageId}`);

    try {
      // Update page status to PROCESSING
      await this.prisma.uploadPage.update({
        where: { id: pageId },
        data: { ocrStatus: 'PROCESSING' },
      });

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`File not found: ${filePath}`);
      }

      // Process with NEW parsing system (content extraction + classification only)
      if (fileType === 'PDF') {
        throw new Error('PDF parsing not yet implemented');
      }

      // Load batch to get contentTypeHint
      const uploadPage = await this.prisma.uploadPage.findUnique({
        where: { id: pageId },
        include: {
          batch: true,
        },
      });

      if (!uploadPage) {
        throw new Error(`Page ${pageId} not found`);
      }

      if (!uploadPage.batch.contentTypeHint) {
        throw new Error(
          `Batch ${uploadPage.batchId} does not have contentTypeHint set`,
        );
      }

      // Parse content using AI Router with provider from batch (if set)
      const providerOverride = uploadPage.batch.visionProvider;
      const parseResult: VisionParseResponse =
        await this.visionService.parseMedicalContent(
          filePath,
          providerOverride || undefined,
          {
            batchId: uploadPage.batchId,
            pageId: pageId,
          },
        );

      // Build rawText from extracted content
      let rawText = '';

      // Add text blocks
      if (
        parseResult.extracted_content.text_blocks &&
        parseResult.extracted_content.text_blocks.length > 0
      ) {
        rawText +=
          parseResult.extracted_content.text_blocks.join('\n\n') + '\n\n';
      }

      // Add tables
      if (
        parseResult.extracted_content.tables &&
        parseResult.extracted_content.tables.length > 0
      ) {
        parseResult.extracted_content.tables.forEach((table, idx) => {
          rawText += `\n=== TABLO ${idx + 1} ===\n`;
          rawText += table.headers.join(' | ') + '\n';
          rawText += table.headers.map(() => '---').join(' | ') + '\n';
          table.rows.forEach((row) => {
            rawText += row.join(' | ') + '\n';
          });
          rawText += '\n';
        });
      }

      // Add algorithms
      if (
        parseResult.extracted_content.algorithms &&
        parseResult.extracted_content.algorithms.length > 0
      ) {
        rawText += '\n=== ALGORİTMA/AKIŞ ŞEMASI ===\n';
        rawText += parseResult.extracted_content.algorithms.join('\n') + '\n';
      }

      // Determine blockType based on extracted content
      let blockType: 'TEXT' | 'TABLE' | 'ALGORITHM' | 'SPOT' = 'TEXT';
      if (
        parseResult.extracted_content.tables &&
        parseResult.extracted_content.tables.length > 0
      ) {
        blockType = 'TABLE';
      } else if (
        parseResult.extracted_content.algorithms &&
        parseResult.extracted_content.algorithms.length > 0
      ) {
        blockType = 'ALGORITHM';
      }

      const lessonId = await this.prisma.lesson
        .upsert({
          where: {
            name: parseResult.classification.lesson || 'Uncategorized Lesson',
          },
          create: {
            name: parseResult.classification.lesson || 'Uncategorized Lesson',
          },
          update: {},
        })
        .then((lesson) => lesson.id);

      const topicId = parseResult.classification.topic
        ? await this.prisma.topic
            .upsert({
              where: {
                name_lessonId: {
                  lessonId: lessonId,
                  name: parseResult.classification.topic,
                },
              },
              create: {
                lessonId: lessonId,
                name: parseResult.classification.topic,
              },
              update: {},
            })
            .then((topic) => topic.id)
        : null;

      const subtopicId =
        parseResult.classification.subtopic && topicId
          ? await this.prisma.subtopic
              .upsert({
                where: {
                  name_topicId: {
                    topicId: topicId,
                    name: parseResult.classification.subtopic,
                  },
                },
                create: {
                  topicId: topicId,
                  name: parseResult.classification.subtopic,
                },
                update: {},
              })
              .then((subtopic) => subtopic.id)
          : null;

      // Create ParsedBlock with:
      // - contentType from batch.contentTypeHint (admin source, NOT from AI)
      // - lesson/topic/subtopic from AI classification
      // - extracted content in structured format
      await this.prisma.parsedBlock.create({
        data: {
          pageId,
          contentType: uploadPage.batch.contentTypeHint, // From admin, NOT from AI
          lessonId: lessonId,
          topicId: topicId,
          subtopicId: subtopicId,
          blockType,
          rawText: rawText.trim() || null,
          tableData:
            parseResult.extracted_content.tables &&
            parseResult.extracted_content.tables.length > 0
              ? (parseResult.extracted_content.tables as any)
              : null,
          algorithmData:
            parseResult.extracted_content.algorithms &&
            parseResult.extracted_content.algorithms.length > 0
              ? (parseResult.extracted_content.algorithms as any)
              : null,
          confidence: 0.95,
          classificationStatus: 'CLASSIFIED',
          approvalStatus: 'PENDING',
        },
      });

      // Update page status to COMPLETED
      await this.prisma.uploadPage.update({
        where: { id: pageId },
        data: {
          ocrStatus: 'COMPLETED',
        },
      });

      // Check if all pages in batch are completed
      const page = await this.prisma.uploadPage.findUnique({
        where: { id: pageId },
        include: {
          batch: {
            include: {
              pages: true,
            },
          },
          blocks: {
            where: {
              deletedAt: null,
            },
            select: { id: true },
          },
        },
      });

      if (page) {
        const allPagesCompleted = page.batch.pages.every(
          (p) => p.ocrStatus === 'COMPLETED' || p.ocrStatus === 'FAILED',
        );

        if (allPagesCompleted) {
          // Set batch status to UPLOADED (all pages processed)
          const currentBatch = await this.prisma.uploadBatch.findUnique({
            where: { id: page.batchId },
          });

          if (
            currentBatch &&
            (currentBatch.status === 'PENDING' ||
              currentBatch.status === 'PROCESSING')
          ) {
            try {
              StateMachineValidator.validateBatchTransition(
                currentBatch.status,
                'UPLOADED',
              );
              await this.prisma.uploadBatch.update({
                where: { id: page.batchId },
                data: { status: 'UPLOADED' },
              });
              this.logger.log(
                `Batch status updated to UPLOADED: ${page.batchId} (all pages processed)`,
              );
            } catch (error) {
              this.logger.warn(
                `Invalid state transition for batch ${page.batchId}: ${error instanceof Error ? error.message : 'Unknown'}`,
              );
            }
          }

          // If batch has blocks ready for review, set to REVIEWED
          if (page.blocks.length > 0) {
            const hasPendingBlocks = await this.prisma.parsedBlock.count({
              where: {
                pageId: { in: page.batch.pages.map((p) => p.id) },
                approvalStatus: 'PENDING',
                deletedAt: null,
              },
            });

            if (hasPendingBlocks > 0) {
              const batchForReview = await this.prisma.uploadBatch.findUnique({
                where: { id: page.batchId },
              });
              if (
                batchForReview &&
                (batchForReview.status === 'UPLOADED' ||
                  batchForReview.status === 'CLASSIFIED')
              ) {
                try {
                  StateMachineValidator.validateBatchTransition(
                    batchForReview.status,
                    'REVIEWED',
                  );
                  await this.prisma.uploadBatch.update({
                    where: { id: page.batchId },
                    data: { status: 'REVIEWED' },
                  });
                  this.logger.log(
                    `Batch status updated to REVIEWED: ${page.batchId} (pages ready with blocks)`,
                  );
                } catch (error) {
                  this.logger.warn(
                    `Invalid state transition for batch ${page.batchId}: ${error instanceof Error ? error.message : 'Unknown'}`,
                  );
                }
              }
            }
          }
        }
      }

      this.logger.log(`Vision job completed for page ${pageId}`);
      return { success: true, pageId };
    } catch (error) {
      this.logger.error(`Vision job failed for page ${pageId}:`, error);

      // Update page status to FAILED
      await this.prisma.uploadPage.update({
        where: { id: pageId },
        data: {
          ocrStatus: 'FAILED',
          ocrError: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }
}
