/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Body,
  Logger,
  Get,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { KnowledgeExtractionService } from './knowledge-extraction.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from '../queue/queues';

@Controller('knowledge-extraction')
export class KnowledgeExtractionController {
  private readonly logger = new Logger(KnowledgeExtractionController.name);

  constructor(
    private readonly knowledgeExtractionService: KnowledgeExtractionService,
    @InjectQueue(QueueName.KNOWLEDGE_EXTRACTION)
    private readonly knowledgeExtractionQueue: Queue,
  ) {}

  /**
   * Queue Knowledge Points generation from analyzed exam questions (async)
   * POST /knowledge-extraction/admin/generate/exam-questions
   */
  @Post('admin/generate/exam-questions')
  async generateFromExamQuestions(
    @Body() body: { examQuestionIds: string[] },
  ): Promise<{
    queued: number;
    skipped: number;
    jobIds: string[];
    errors: Array<{ examQuestionId: string; reason: string }>;
  }> {
    this.logger.log(
      `Admin queueing KP generation for ${body.examQuestionIds.length} exam questions`,
    );

    const result =
      await this.knowledgeExtractionService.queueKnowledgePointGenerationForExamQuestions(
        body.examQuestionIds,
      );

    this.logger.log(
      `Queued ${result.queued} exam questions, skipped ${result.skipped}`,
    );

    return result;
  }

  /**
   * Generate Knowledge Points from analyzed exam questions (synchronous - for testing/admin panel)
   * POST /knowledge-extraction/admin/generate/exam-questions/sync
   */
  @Post('admin/generate/exam-questions/sync')
  async generateFromExamQuestionsSync(
    @Body() body: { examQuestionIds: string[] },
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      examQuestionId: string;
      kpCount?: number;
      spotRuleCount?: number;
      clinicalCorrelationCount?: number;
      examTrapCount?: number;
      error?: string;
      success: boolean;
    }>;
  }> {
    this.logger.log(
      `Admin generating KPs from ${body.examQuestionIds.length} exam questions`,
    );

    const results: Array<{
      examQuestionId: string;
      kpCount?: number;
      spotRuleCount?: number;
      clinicalCorrelationCount?: number;
      examTrapCount?: number;
      error?: string;
      success: boolean;
    }> = [];

    for (const eqId of body.examQuestionIds) {
      try {
        const result =
          await this.knowledgeExtractionService.generateKnowledgePointsFromExamQuestion(
            eqId,
          );

        const totalKps = result.knowledgePoints.length;

        results.push({
          examQuestionId: eqId,
          kpCount: totalKps,
          spotRuleCount: result.spotRuleCount,
          clinicalCorrelationCount: result.clinicalCorrelationCount,
          examTrapCount: result.examTrapCount,
          success: true,
        });
      } catch (error) {
        results.push({
          examQuestionId: eqId,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    this.logger.log(
      `KP generation completed: ${successful} successful, ${failed} failed`,
    );

    return {
      total: body.examQuestionIds.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Get job status for knowledge point generation
   * GET /knowledge-extraction/admin/jobs/:jobId/status
   */
  @Get('admin/jobs/:jobId/status')
  async getJobStatus(@Param('jobId') jobId: string): Promise<{
    jobId: string;
    state: string;
    progress?: number;
    result?: any;
    failedReason?: string;
    examQuestionId?: string;
    knowledgePointsCreated?: number;
  }> {
    const job = await this.knowledgeExtractionQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    const progress = job.progress;

    let result: any = null;
    let failedReason: string | undefined = undefined;

    if (state === 'completed') {
      result = job.returnvalue;
    } else if (state === 'failed') {
      failedReason = job.failedReason;
    }

    return {
      jobId: job.id || jobId,
      state: state || 'unknown',
      progress: typeof progress === 'number' ? progress : undefined,
      result,
      failedReason,
      examQuestionId: job.data.examQuestionId,
      knowledgePointsCreated: result?.knowledgePointsCreated,
    };
  }

  /**
   * Get bulk job status for multiple jobs
   * POST /knowledge-extraction/admin/jobs/bulk-status
   */
  @Post('admin/jobs/bulk-status')
  async getBulkJobStatus(
    @Body() body: { jobIds: string[] },
  ): Promise<{
    jobs: Array<{
      jobId: string;
      state: string;
      examQuestionId?: string;
      knowledgePointsCreated?: number;
      error?: string;
    }>;
  }> {
    const jobs = await Promise.all(
      body.jobIds.map(async (jobId) => {
        try {
          const job = await this.knowledgeExtractionQueue.getJob(jobId);
          if (!job) {
            return { jobId, state: 'not_found' };
          }

          const state = await job.getState();
          const result: any = state === 'completed' ? job.returnvalue : null;

          return {
            jobId: job.id || jobId,
            state: state || 'unknown',
            examQuestionId: job.data.examQuestionId,
            knowledgePointsCreated: result?.knowledgePointsCreated,
            error: state === 'failed' ? job.failedReason : undefined,
          };
        } catch (error) {
          return {
            jobId,
            state: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }),
    );

    return { jobs };
  }
}
