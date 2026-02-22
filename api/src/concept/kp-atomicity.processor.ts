/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { KnowledgePointAtomicityService } from './knowledge-point-atomicity.service';
import { AtomicityStatus } from '@prisma/client';

@Processor('kp-atomicity')
export class KPAtomicityProcessor extends WorkerHost {
  private readonly logger = new Logger(KPAtomicityProcessor.name);

  constructor(
    private readonly atomicityService: KnowledgePointAtomicityService,
  ) {
    super();
    this.logger.log('✅ KPAtomicityProcessor initialized and ready');
  }

  async process(job: Job) {
    if (job.name === 'validate-many') {
      return this.processValidateMany(
        job as Job<{
          where?: {
            kpIds?: string[];
            topicId?: string;
            subtopicId?: string;
            atomicityStatus?: AtomicityStatus;
          };
          limit?: number;
        }>,
      );
    }

    if (job.name === 'split-non-atomic') {
      return this.processSplitNonAtomic(
        job as Job<{
          where?: {
            kpIds?: string[];
            topicId?: string;
            subtopicId?: string;
          };
          limit?: number;
        }>,
      );
    }

    this.logger.warn(`Unknown job type received: ${job.name}`);
    return { ignored: true, reason: `Unknown job type: ${job.name}` };
  }

  /**
   * Process validate-many job
   * Job name: "validate-many"
   * Payload: { where?: { topicId?, subtopicId?, atomicityStatus? }, limit?: number }
   */
  async processValidateMany(
    job: Job<{
      where?: {
        kpIds?: string[];
        topicId?: string;
        subtopicId?: string;
        atomicityStatus?: AtomicityStatus;
      };
      limit?: number;
    }>,
  ): Promise<{ processed: number; results: any[] }> {
    try {
      this.logger.log(
        `Processing validate-many job ${job.id} with payload: ${JSON.stringify(job.data)}`,
      );

      const filter = {
        kpIds: job.data.where?.kpIds,
        topicId: job.data.where?.topicId,
        subtopicId: job.data.where?.subtopicId,
        atomicityStatus: job.data.where?.atomicityStatus,
        limit: job.data.limit ?? 100,
      };

      const result = await this.atomicityService.validateMany(filter);

      await job.updateProgress(100);

      this.logger.log(
        `Validate-many job ${job.id} completed: processed=${result.processed}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Validate-many job ${job.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Process split-non-atomic job
   * Job name: "split-non-atomic"
   * Payload: { where?: { topicId?, subtopicId? }, limit?: number }
   */
  async processSplitNonAtomic(
    job: Job<{
      where?: {
        kpIds?: string[];
        topicId?: string;
        subtopicId?: string;
      };
      limit?: number;
    }>,
  ): Promise<{
    processed: number;
    totalCreated: number;
    totalDeduped: number;
  }> {
    try {
      this.logger.log(
        `Processing split-non-atomic job ${job.id} with payload: ${JSON.stringify(job.data)}`,
      );

      const filter = {
        kpIds: job.data.where?.kpIds,
        topicId: job.data.where?.topicId,
        subtopicId: job.data.where?.subtopicId,
        limit: job.data.limit ?? 100,
      };

      const result = await this.atomicityService.splitMany(filter);

      await job.updateProgress(100);

      this.logger.log(
        `Split-non-atomic job ${job.id} completed: processed=${result.processed}, created=${result.totalCreated}, deduped=${result.totalDeduped}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Split-non-atomic job ${job.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
