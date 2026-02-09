import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockType } from '@prisma/client';

@Injectable()
export class ParsingService {
  private readonly logger = new Logger(ParsingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async classifyBlock(blockId: string): Promise<BlockType> {
    try {
      this.logger.debug(`Classifying block: ${blockId}`);

      const block = await this.prisma.parsedBlock.findUnique({
        where: { id: blockId },
      });

      if (!block) {
        this.logger.error(`Block not found: ${blockId}`);
        throw new Error(`Block ${blockId} not found`);
      }

      // If already classified, return existing type
      if (block.classificationStatus === 'CLASSIFIED' && block.blockType) {
        this.logger.debug(
          `Block ${blockId} already classified as ${block.blockType}`,
        );
        return block.blockType;
      }

      // Classification logic
      // For now, we trust the Vision service's initial classification
      // In production, you might want to add additional ML-based classification

      let blockType: BlockType = block.blockType || 'TEXT';

      // If block has tableData, it's definitely a TABLE
      if (block.tableData) {
        blockType = 'TABLE';
      }
      // If block has algorithmData, it's definitely an ALGORITHM
      else if (block.algorithmData) {
        blockType = 'ALGORITHM';
      }
      // Otherwise, it's TEXT
      else {
        blockType = 'TEXT';
      }

      // Update block
      await this.prisma.parsedBlock.update({
        where: { id: blockId },
        data: {
          blockType,
          classificationStatus: 'CLASSIFIED',
          classifiedAt: new Date(),
        },
      });

      this.logger.log(`Classified block ${blockId} as ${blockType}`);

      return blockType;
    } catch (error) {
      this.logger.error(
        `Failed to classify block ${blockId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async classifyPageBlocks(pageId: string) {
    try {
      this.logger.debug(`Classifying page blocks: ${pageId}`);

      const blocks = await this.prisma.parsedBlock.findMany({
        where: {
          pageId,
          classificationStatus: 'PENDING',
        },
      });

      this.logger.debug(
        `Found ${blocks.length} pending blocks for page: ${pageId}`,
      );

      for (const block of blocks) {
        await this.classifyBlock(block.id);
      }

      this.logger.log(`Classified ${blocks.length} blocks for page: ${pageId}`);

      return {
        pageId,
        blocksClassified: blocks.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to classify page blocks ${pageId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async classifyBatchBlocks(batchId: string) {
    try {
      this.logger.debug(`Classifying batch blocks: ${batchId}`);

      const pages = await this.prisma.uploadPage.findMany({
        where: { batchId },
        include: {
          blocks: {
            where: { classificationStatus: 'PENDING' },
          },
        },
      });

      let totalClassified = 0;
      for (const page of pages) {
        this.logger.debug(
          `Processing page ${page.id} with ${page.blocks.length} pending blocks`,
        );
        for (const block of page.blocks) {
          await this.classifyBlock(block.id);
          totalClassified++;
        }
      }

      this.logger.log(
        `Classified ${totalClassified} blocks for batch: ${batchId}`,
      );

      return {
        batchId,
        blocksClassified: totalClassified,
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
