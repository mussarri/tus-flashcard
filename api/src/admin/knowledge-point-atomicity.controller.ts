/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Logger,
  HttpException,
  } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { KnowledgePointAtomicityService } from '../concept/knowledge-point-atomicity.service';
import { QueueName } from '../queue/queues';
import { AtomicityStatus } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
} from 'class-validator';

// DTOs
class AtomicityValidateRequestDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  kpIds?: string[];

  @IsString()
  @IsOptional()
  topicId?: string;

  @IsString()
  @IsOptional()
  subtopicId?: string;

  @IsEnum(['INLINE', 'QUEUE'])
  @IsOptional()
  mode: 'INLINE' | 'QUEUE' = 'QUEUE';

  @IsNumber()
  @IsOptional()
  limit? = 100;
}

class AtomicitySplitRequestDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  kpIds?: string[];

  @IsString()
  @IsOptional()
  topicId?: string;

  @IsString()
  @IsOptional()
  subtopicId?: string;

  @IsEnum(['INLINE', 'QUEUE'])
  @IsOptional()
  mode: 'INLINE' | 'QUEUE' = 'QUEUE';

  @IsNumber()
  @IsOptional()
  limit? = 100;
}

@Controller('admin/knowledge-points/atomicity')
export class KnowledgePointAtomicityController {
  private readonly logger = new Logger(KnowledgePointAtomicityController.name);

  constructor(
    private readonly atomicityService: KnowledgePointAtomicityService,
    @InjectQueue(QueueName.KP_ATOMICITY)
    private readonly atomicityQueue: Queue,
  ) {}

  /**
   * POST /validate
   * Validate KPs for atomicity
   * Mode: INLINE (immediate) or QUEUE (background)
   */
  @Post('validate')
  async validateKnowledgePoints(@Body() dto: AtomicityValidateRequestDto) {
    try {
      if (dto.mode === 'INLINE') {
        // Inline mode: validate immediately
        if (dto.kpIds && dto.kpIds.length > 0) {
          // Validate specific KPs
          const results: Array<{
            kpId: string;
            status: AtomicityStatus;
            score?: number;
            reason?: string;
            error?: string;
          }> = [];
          for (const kpId of dto.kpIds) {
            try {
              const result = await this.atomicityService.validateOne(kpId);
              results.push({ kpId, ...result });
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';
              results.push({
                kpId,
                status: 'FAILED' as const,
                error: errorMessage,
              });
            }
          }
          return {
            success: true,
            mode: 'INLINE',
            processed: results.length,
            results,
          };
        } else {
          // Validate by filter with limit
          const result = await this.atomicityService.validateMany({
            kpIds: dto.kpIds,
            topicId: dto.topicId,
            subtopicId: dto.subtopicId,
            limit: Math.min(dto.limit ?? 100, 100), // Max 100 for safety
          });
          return {
            success: true,
            mode: 'INLINE',
            ...result,
          };
        }
      } else {
        // Queue mode: enqueue job
        const jobData = {
          where: {
            ...(dto.topicId ? { topicId: dto.topicId } : {}),
            ...(dto.subtopicId ? { subtopicId: dto.subtopicId } : {}),
            ...(dto.kpIds?.length ? { kpIds: dto.kpIds } : {}),
          },
          limit: dto.limit ?? 100,
        };

        const job = await this.atomicityQueue.add('validate-many', jobData, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: false,
          removeOnFail: false,
        });

        return {
          success: true,
          mode: 'QUEUE',
          jobId: job.id,
          message: `Validation job queued (ID: ${job.id})`,
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to validate knowledge points: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        `Failed to validate: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  /**
   * POST /split
   * Split non-atomic KPs into atomic ones
   * Mode: INLINE (immediate) or QUEUE (background)
   */
  @Post('split')
  async splitNonAtomicKnowledgePoints(@Body() dto: AtomicitySplitRequestDto) {
    try {
      if (dto.mode === 'INLINE') {
        // Inline mode: split immediately
        if (dto.kpIds && dto.kpIds.length > 0) {
          // Split specific KPs
          const results: Array<{
            kpId: string;
            created?: number;
            deduped?: number;
            failed?: number;
            error?: string;
          }> = [];
          let totalCreated = 0;
          let totalDeduped = 0;

          for (const kpId of dto.kpIds) {
            try {
              const result = await this.atomicityService.splitAndReplace(kpId);
              results.push({ kpId, ...result });
              totalCreated += result.created;
              totalDeduped += result.deduped;
            } catch (error) {
              results.push({
                kpId,
                created: 0,
                deduped: 0,
                failed: 1,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }

          return {
            success: true,
            mode: 'INLINE',
            processed: results.length,
            totalCreated,
            totalDeduped,
            results,
          };
        } else {
          // Split by filter with limit
          const result = await this.atomicityService.splitMany({
            topicId: dto.topicId,
            subtopicId: dto.subtopicId,
            limit: Math.min(dto.limit ?? 100, 50), // Max 50 for safety in INLINE
          });
          return {
            success: true,
            mode: 'INLINE',
            ...result,
          };
        }
      } else {
        // Queue mode: enqueue job
        const jobData = {
          where: {
            ...(dto.topicId ? { topicId: dto.topicId } : {}),
            ...(dto.subtopicId ? { subtopicId: dto.subtopicId } : {}),
            ...(dto.kpIds?.length ? { kpIds: dto.kpIds } : {}),
          },
          limit: dto.limit ?? 100,
        };

        const job = await this.atomicityQueue.add('split-non-atomic', jobData, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: false,
          removeOnFail: false,
        });

        return {
          success: true,
          mode: 'QUEUE',
          jobId: job.id,
          message: `Split job queued (ID: ${job.id})`,
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to split knowledge points: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        `Failed to split: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  /**
   * GET /stats
   * Get atomicity statistics
   */
  @Get('stats')
  async getAtomicityStats(
    @Query('topicId') topicId?: string,
    @Query('subtopicId') subtopicId?: string,
  ) {
    try {
      const stats = await this.atomicityService.getStats({
        topicId,
        subtopicId,
      });

      return {
        success: true,
        stats,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get atomicity stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        `Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }
}
