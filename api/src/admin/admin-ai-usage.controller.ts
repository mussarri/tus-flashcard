import {
  Controller,
  Get,
  Param,
  Query,
  Logger,
  HttpException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdminAIUsageService } from './admin-ai-usage.service';

@Controller('admin/ai-usage')
export class AdminAIUsageController {
  private readonly logger = new Logger(AdminAIUsageController.name);

  constructor(private readonly adminAIUsageService: AdminAIUsageService) {}

  @Get('summary')
  async getSummary() {
    try {
      const summary = await this.adminAIUsageService.getSummary();
      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get AI usage summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get AI usage summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('by-task')
  async getUsageByTask() {
    try {
      const usage = await this.adminAIUsageService.getUsageByTask();
      return {
        success: true,
        data: usage,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get AI usage by task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get AI usage by task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('by-model')
  async getUsageByModel() {
    try {
      const usage = await this.adminAIUsageService.getUsageByModel();
      return {
        success: true,
        data: usage,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get AI usage by model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get AI usage by model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('by-day')
  async getUsageByDay(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    try {
      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to) : undefined;

      if (fromDate && isNaN(fromDate.getTime())) {
        throw new HttpException('Invalid from date format', 400);
      }
      if (toDate && isNaN(toDate.getTime())) {
        throw new HttpException('Invalid to date format', 400);
      }

      const usage = await this.adminAIUsageService.getUsageByDay(fromDate, toDate);
      return {
        success: true,
        data: usage,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to get AI usage by day: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get AI usage by day: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('by-topic/:topicId')
  async getUsageByTopic(@Param('topicId') topicId: string) {
    try {
      const usage = await this.adminAIUsageService.getUsageByTopic(topicId);
      return {
        success: true,
        data: usage,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get AI usage by topic ${topicId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get AI usage by topic: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  @Get('by-batch/:batchId')
  async getUsageByBatch(@Param('batchId', ParseUUIDPipe) batchId: string) {
    try {
      const usage = await this.adminAIUsageService.getUsageByBatch(batchId);
      return {
        success: true,
        data: usage,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get AI usage by batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to get AI usage by batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }
}
