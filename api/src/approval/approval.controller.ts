import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { ApproveBlockDto, RejectBlockDto } from './dto/approve-block.dto';
import { CreateManualBlockDto } from './dto/create-manual-block.dto';

@Controller('api/approval')
export class ApprovalController {
  private readonly logger = new Logger(ApprovalController.name);

  constructor(private readonly approvalService: ApprovalService) {}

  @Post('block/:blockId/approve')
  async approveBlock(
    @Param('blockId', ParseUUIDPipe) blockId: string,
    @Body() dto: ApproveBlockDto,
  ) {
    try {
      // TODO: Get actual admin user ID from auth
      const approvedBy = 'admin-user-id';
      this.logger.log(
        `Approving block: ${blockId}, edited: ${!!dto.editedText}`,
      );

      const approvedContent = await this.approvalService.approveBlock(
        blockId,
        approvedBy,
        dto.editedText,
      );

      this.logger.log(`Block approved successfully: ${blockId}`);

      return {
        success: true,
        approvedContent,
      };
    } catch (error) {
      this.logger.error(
        `Failed to approve block ${blockId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Post('block/:blockId/reject')
  async rejectBlock(
    @Param('blockId', ParseUUIDPipe) blockId: string,
    @Body() dto: RejectBlockDto,
  ) {
    try {
      // TODO: Get actual admin user ID from auth
      const approvedBy = 'admin-user-id';
      this.logger.log(
        `Rejecting block: ${blockId}, reason: ${dto.reason || 'none'}`,
      );

      await this.approvalService.rejectBlock(blockId, approvedBy);

      this.logger.log(`Block rejected successfully: ${blockId}`);

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to reject block ${blockId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Post('block/:blockId/delete')
  async deleteBlock(@Param('blockId', ParseUUIDPipe) blockId: string) {
    try {
      // TODO: Get actual admin user ID from auth
      const approvedBy = 'admin-user-id';
      this.logger.log(`Deleting block: ${blockId}`);

      await this.approvalService.deleteBlock(blockId, approvedBy);

      this.logger.log(`Block deleted successfully: ${blockId}`);

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete block ${blockId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Get('batch/:batchId/review')
  async getBatchForReview(@Param('batchId', ParseUUIDPipe) batchId: string) {
    try {
      this.logger.log(`Getting batch for review: ${batchId}`);
      const batch = await this.approvalService.getBatchForReview(batchId);
      this.logger.log(
        `Batch retrieved for review: ${batchId}, pages: ${batch.pages.length}`,
      );

      return {
        success: true,
        batch,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get batch for review ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Get('batch/:batchId/approved')
  async getApprovedBlocks(@Param('batchId', ParseUUIDPipe) batchId: string) {
    try {
      this.logger.log(`Getting approved blocks for batch: ${batchId}`);
      const approvedBlocks =
        await this.approvalService.getApprovedBlocks(batchId);
      this.logger.log(
        `Retrieved ${approvedBlocks.length} approved blocks for batch: ${batchId}`,
      );

      return {
        success: true,
        approvedBlocks,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get approved blocks for batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Post('page/:pageId/manual-block')
  async createManualBlock(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Body() dto: CreateManualBlockDto,
  ) {
    try {
      // TODO: Get actual admin user ID from auth
      const createdBy = 'admin-user-id';
      this.logger.log(
        `Creating manual block for page: ${pageId}, contentType: ${dto.contentType}`,
      );

      const block = await this.approvalService.createManualBlock(
        pageId,
        dto.rawText,
        dto.contentType,
        createdBy,
        dto.lesson,
        dto.topic,
        dto.subtopic,
      );

      this.logger.log(`Manual block created successfully: ${block.id}`);

      return {
        success: true,
        block,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create manual block for page ${pageId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
