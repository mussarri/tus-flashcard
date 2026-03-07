import { Body, Controller, Get, Logger, Post, Query } from '@nestjs/common';
import { KnowledgeExtractionService } from './knowledge-extraction.service';
import {
  ExtractionMode,
  KnowledgeExtractionLogsQueryDto,
  KnowledgeExtractionStatusQueryDto,
  RunBatchKnowledgeExtractionDto,
  RunKnowledgeExtractionDto,
} from './dto/knowledge-extraction.dto';

@Controller('admin/knowledge-extraction')
export class KnowledgeExtractionController {
  private readonly logger = new Logger(KnowledgeExtractionController.name);

  constructor(
    private readonly knowledgeExtractionService: KnowledgeExtractionService,
  ) {}

  @Post('run')
  async run(@Body() body: RunKnowledgeExtractionDto): Promise<{
    status: 'QUEUED';
    approvedContentId: string;
    mode: ExtractionMode;
    jobId?: string;
  }> {
    this.logger.log(
      `Queueing extraction for approvedContent=${body.approvedContentId}, mode=${body.mode}`,
    );

    const queued = await this.knowledgeExtractionService.queueSingleExtraction(
      body.approvedContentId,
      body.mode,
    );

    return {
      status: 'QUEUED',
      approvedContentId: body.approvedContentId,
      mode: body.mode,
      jobId: queued.jobId,
    };
  }

  @Post('run-batch')
  async runBatch(@Body() body: RunBatchKnowledgeExtractionDto): Promise<{
    batchId: string;
    mode: ExtractionMode;
    queuedCount: number;
  }> {
    this.logger.log(
      `Queueing batch extraction for batch=${body.batchId}, mode=${body.mode}`,
    );

    const result = await this.knowledgeExtractionService.queueBatchExtraction(
      body.batchId,
      body.mode,
    );

    return {
      batchId: body.batchId,
      mode: body.mode,
      queuedCount: result.queuedCount,
    };
  }

  @Get('status')
  async status(@Query() query: KnowledgeExtractionStatusQueryDto): Promise<{
    counts: {
      NOT_STARTED: number;
      QUEUED: number;
      PROCESSING: number;
      COMPLETED: number;
      FAILED: number;
    };
    items: Array<{
      approvedContentId: string;
      extractionStatus: string;
      lastError?: string;
      kpCount?: number;
    }>;
  }> {
    return this.knowledgeExtractionService.getBatchExtractionStatus(
      query.batchId,
    );
  }

  @Get('logs')
  async logs(@Query() query: KnowledgeExtractionLogsQueryDto): Promise<{
    batchId: string;
    logs: Array<{
      jobId: string;
      approvedContentId?: string;
      mode?: ExtractionMode;
      state: string;
      lastError?: string;
      processedOn?: number;
      finishedOn?: number;
    }>;
  }> {
    const logs = await this.knowledgeExtractionService.getBatchExtractionLogs(
      query.batchId,
      query.limit,
    );

    return {
      batchId: query.batchId,
      logs,
    };
  }
}
