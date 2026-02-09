import { Controller, Post, Param, ParseUUIDPipe, Logger } from '@nestjs/common';
import { ParsingService } from './parsing.service';

@Controller('api/parsing')
export class ParsingController {
  private readonly logger = new Logger(ParsingController.name);

  constructor(private readonly parsingService: ParsingService) {}

  @Post('block/:blockId/classify')
  async classifyBlock(@Param('blockId', ParseUUIDPipe) blockId: string) {
    try {
      this.logger.log(`Classifying block: ${blockId}`);
      const blockType = await this.parsingService.classifyBlock(blockId);
      this.logger.log(`Block classified: ${blockId} as ${blockType}`);

      return {
        success: true,
        blockId,
        blockType,
      };
    } catch (error) {
      this.logger.error(
        `Failed to classify block ${blockId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Post('page/:pageId/classify')
  async classifyPage(@Param('pageId', ParseUUIDPipe) pageId: string) {
    try {
      this.logger.log(`Classifying page blocks: ${pageId}`);
      const result = await this.parsingService.classifyPageBlocks(pageId);
      this.logger.log(
        `Page blocks classified: ${pageId}, blocks: ${result.blocksClassified}`,
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to classify page blocks ${pageId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Post('batch/:batchId/classify')
  async classifyBatch(@Param('batchId', ParseUUIDPipe) batchId: string) {
    try {
      this.logger.log(`Classifying batch blocks: ${batchId}`);
      const result = await this.parsingService.classifyBatchBlocks(batchId);
      this.logger.log(
        `Batch blocks classified: ${batchId}, blocks: ${result.blocksClassified}`,
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to classify batch blocks ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
