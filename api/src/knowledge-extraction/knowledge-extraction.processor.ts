import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeExtractionService } from './knowledge-extraction.service';
import { StateMachineValidator } from '../common/validators/state-machine.validator';

interface KnowledgeExtractionJobData {
  approvedContentId?: string;
  examQuestionId?: string;
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
    const { approvedContentId, examQuestionId } = job.data;

    // Route to appropriate handler based on job data
    if (examQuestionId) {
      return this.processExamQuestionJob(job, examQuestionId);
    } else if (approvedContentId) {
      return this.processApprovedContentJob(job, approvedContentId);
    } else {
      throw new BadRequestException(
        'Job data must include either approvedContentId or examQuestionId',
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
    this.logger.log(
      `Processing knowledge extraction job for approvedContent: ${approvedContentId}`,
    );

    try {
      // Check current status and validate transition
      const approvedContent = await this.prisma.approvedContent.findUnique({
        where: { id: approvedContentId },
        select: { extractionStatus: true },
      });

      if (!approvedContent) {
        throw new BadRequestException(
          `ApprovedContent ${approvedContentId} not found`,
        );
      }

      // Duplicate protection: Only allow extraction if status is NOT_STARTED or VERIFIED (for reprocessing)
      if (
        !StateMachineValidator.canTriggerExtraction(
          approvedContent.extractionStatus,
        )
      ) {
        this.logger.warn(
          `Duplicate extraction attempt blocked for approvedContent: ${approvedContentId}, current status: ${approvedContent.extractionStatus}`,
        );
        throw new BadRequestException(
          `Cannot extract knowledge: Content already processed (status: ${approvedContent.extractionStatus}). Reset to NOT_STARTED for reprocessing.`,
        );
      }

      // Validate state transition
      StateMachineValidator.validateExtractionTransition(
        approvedContent.extractionStatus,
        'PROCESSING',
      );

      // Update extraction status to PROCESSING
      await this.prisma.approvedContent.update({
        where: { id: approvedContentId },
        data: { extractionStatus: 'PROCESSING' },
      });

      // Extract knowledge points
      const knowledgePoints =
        await this.knowledgeExtractionService.extractKnowledgePoints(
          approvedContentId,
        );

      // Save to database
      const savedCount =
        await this.knowledgeExtractionService.saveKnowledgePoints(
          approvedContentId,
          knowledgePoints,
        );

      // Update extraction status to COMPLETED
      await this.prisma.approvedContent.update({
        where: { id: approvedContentId },
        data: {
          extractionStatus: 'COMPLETED',
          extractedAt: new Date(),
        },
      });

      this.logger.log(
        `Knowledge extraction completed for approvedContent: ${approvedContentId}, saved ${savedCount} knowledge points`,
      );

      return {
        success: true,
        approvedContentId,
        knowledgePointsExtracted: knowledgePoints.length,
        knowledgePointsSaved: savedCount,
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
}
