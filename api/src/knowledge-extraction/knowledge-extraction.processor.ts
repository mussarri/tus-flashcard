/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeExtractionService } from './knowledge-extraction.service';
import { ExtractionMode } from './dto/knowledge-extraction.dto';

interface KnowledgeExtractionJobData {
  approvedContentId?: string;
  examQuestionId?: string;
  batchId?: string;
  mode?: ExtractionMode;
}

@Processor('knowledge-extraction')
export class KnowledgeExtractionProcessor extends WorkerHost {
  private readonly logger = new Logger(KnowledgeExtractionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledgeExtractionService: KnowledgeExtractionService,
  ) {
    super();
  }

  async process(job: Job<KnowledgeExtractionJobData>) {
    const { approvedContentId, examQuestionId, batchId } = job.data;

    // Route to appropriate handler based on job data
    if (examQuestionId) {
      return this.processExamQuestionJob(job, examQuestionId);
    } else if (batchId) {
      return this.processBatchJob(job, batchId);
    } else if (approvedContentId) {
      return this.processApprovedContentJob(job, approvedContentId);
    } else {
      throw new BadRequestException(
        'Job data must include approvedContentId, batchId, or examQuestionId',
      );
    }
  }

  /**
   * Process knowledge extraction for exam questions
   */
  private async processExamQuestionJob(
    job: Job<KnowledgeExtractionJobData>,
    examQuestionId: string,
  ) {
    this.logger.log(
      `Processing knowledge extraction job for examQuestion: ${examQuestionId}`,
    );

    try {
      // Generate knowledge points from exam question
      const result =
        await this.knowledgeExtractionService.generateKnowledgePointsFromExamQuestion(
          examQuestionId,
        );

      this.logger.log(
        `Knowledge extraction completed for examQuestion: ${examQuestionId}, created ${result.knowledgePoints.length} knowledge points`,
      );

      return {
        success: true,
        examQuestionId,
        knowledgePointsCreated: result.knowledgePoints.length,
        spotRuleCount: result.spotRuleCount,
        clinicalCorrelationCount: result.clinicalCorrelationCount,
        examTrapCount: result.examTrapCount,
      };
    } catch (error) {
      this.logger.error(
        `Knowledge extraction job failed for examQuestion ${examQuestionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }

  /**
   * Process knowledge extraction for approved content
   */
  private async processApprovedContentJob(
    job: Job<KnowledgeExtractionJobData>,
    approvedContentId: string,
  ) {
    const mode = job.data.mode ?? ExtractionMode.APPEND;
    this.logger.log(
      `Processing knowledge extraction job for approvedContent: ${approvedContentId}, mode=${mode}`,
    );

    try {
      const result =
        await this.knowledgeExtractionService.processApprovedContentExtraction(
          approvedContentId,
          mode,
        );

      this.logger.log(
        `Knowledge extraction completed for approvedContent: ${approvedContentId}, extracted=${result.extracted}, created=${result.created}, updated=${result.updated}`,
      );

      return {
        success: true,
        approvedContentId,
        mode,
        knowledgePointsExtracted: result.extracted,
        knowledgePointsSaved: result.created + result.updated,
        sourceCountIncremented: result.sourceCountIncremented,
      };
    } catch (error) {
      this.logger.error(
        `Knowledge extraction job failed for approvedContent ${approvedContentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Update extraction status to FAILED
      try {
        await this.prisma.approvedContent.update({
          where: { id: approvedContentId },
          data: {
            extractionStatus: 'FAILED',
          },
        });
      } catch (updateError) {
        this.logger.error(
          `Failed to update extraction status to FAILED: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`,
        );
      }

      throw error;
    }
  }

  private async processBatchJob(
    job: Job<KnowledgeExtractionJobData>,
    batchId: string,
  ) {
    this.logger.log(`Processing knowledge extraction batch job: ${batchId}`);

    const approvedContents = await this.prisma.approvedContent.findMany({
      where: {
        batchId,
        extractionStatus: {
          in: ['QUEUED', 'NOT_STARTED', 'VERIFIED'],
        },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    let processed = 0;
    let failed = 0;

    for (const approvedContent of approvedContents) {
      try {
        await this.knowledgeExtractionService.processApprovedContentExtraction(
          approvedContent.id,
        );
        processed += 1;
      } catch (error) {
        failed += 1;
        this.logger.error(
          `Batch extraction failed for ApprovedContent ${approvedContent.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return {
      success: failed === 0,
      batchId,
      total: approvedContents.length,
      processed,
      failed,
    };
  }
}
