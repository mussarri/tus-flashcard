import {
  Injectable,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { normalizeText, splitText, SplitStrategy } from './text-split.util';
import { DedupPolicy } from './dto/create-manual-batch.dto';
import { AIProviderType, ContentType } from '@prisma/client';

export interface CreateManualBatchInput {
  title: string;
  lessonId: string;
  topicId: string;
  subtopicId?: string;
  contentTypeHint?: ContentType;
  rawText: string;
  splitStrategy?: SplitStrategy;
  dedupPolicy?: DedupPolicy;
  visionProvider?: AIProviderType;
  createdBy?: string;
}

export interface ManualBatchResult {
  batchId: string;
  pageId: string;
  blockCount: number;
  textHash: string;
}

@Injectable()
export class ManualBatchService {
  private readonly logger = new Logger(ManualBatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Create a manual text batch through the full pipeline:
   * UploadBatch → UploadPage(TEXT) → ParsedBlocks(PENDING)
   */
  async createManualBatch(
    input: CreateManualBatchInput,
  ): Promise<ManualBatchResult> {
    const {
      title,
      lessonId,
      topicId,
      subtopicId,
      contentTypeHint,
      rawText,
      splitStrategy = 'AUTO',
      dedupPolicy = DedupPolicy.REJECT_IF_DUPLICATE,
      visionProvider,
      createdBy = 'admin-user-id',
    } = input;

    if (!rawText || !rawText.trim()) {
      throw new BadRequestException('rawText must not be empty');
    }

    // 1. Normalize & hash
    const normalizedText = normalizeText(rawText);
    const textHash = crypto
      .createHash('sha256')
      .update(normalizedText)
      .digest('hex');

    this.logger.log(
      `Creating manual batch: title="${title}", strategy=${splitStrategy}, dedup=${dedupPolicy}, hash=${textHash.substring(0, 12)}…`,
    );

    // 2. Dedup check
    if (dedupPolicy === DedupPolicy.REJECT_IF_DUPLICATE) {
      const existing = await this.prisma.uploadPage.findFirst({
        where: {
          textHash,
          fileType: 'TEXT',
          batch: { sourceType: 'MANUAL_TEXT' },
        },
        select: { id: true, batchId: true },
      });

      if (existing) {
        this.logger.warn(
          `Duplicate text detected for batch ${existing.batchId}, hash=${textHash.substring(0, 12)}`,
        );
        throw new ConflictException({
          message:
            'Duplicate text: a batch with the same content already exists.',
          existingBatchId: existing.batchId,
        });
      }
    }

    // 3. Split text into chunks
    const chunks = splitText(normalizedText, splitStrategy);

    if (chunks.length === 0) {
      throw new BadRequestException(
        'No content blocks could be extracted from the provided text.',
      );
    }

    this.logger.log(
      `Split produced ${chunks.length} blocks using strategy=${splitStrategy}`,
    );

    // 4. Transactional create: batch + page + blocks
    const result = await this.prisma.$transaction(async (tx) => {
      // Create UploadBatch
      const batch = await tx.uploadBatch.create({
        data: {
          topic: title,
          description: `Manual text batch – ${title}`,
          createdBy,
          contentTypeHint: contentTypeHint ?? null,
          visionProvider: visionProvider ?? null,
          status: 'UPLOADED',
          sourceType: 'MANUAL_TEXT',
          lessonId,
          topicId,
          subtopicId: subtopicId ?? null,
        },
      });

      // Create UploadPage (TEXT type – no file, no OCR)
      const page = await tx.uploadPage.create({
        data: {
          batchId: batch.id,
          pageNumber: 1,
          fileType: 'TEXT',
          filePath: null,
          originalName: `manual-text-${batch.id}.txt`,
          rawText: normalizedText,
          textHash,
          ocrStatus: 'COMPLETED', // No OCR needed
        },
      });

      // Create ParsedBlocks
      const blockData = chunks.map((chunk, index) => ({
        pageId: page.id,
        blockIndex: index,
        rawText: chunk,
        contentType: contentTypeHint ?? ContentType.MIXED_CONTENT,
        lessonId,
        topicId,
        subtopicId: subtopicId ?? null,
        blockType: 'TEXT' as const,
        confidence: 1.0,
        classificationStatus: 'CLASSIFIED' as const,
        approvalStatus: 'PENDING' as const,
      }));

      await tx.parsedBlock.createMany({ data: blockData });

      // Advance batch to CLASSIFIED
      await tx.uploadBatch.update({
        where: { id: batch.id },
        data: { status: 'CLASSIFIED' },
      });

      return { batch, page, blockCount: chunks.length };
    });

    // 5. Audit log (best-effort)
    await this.auditLog.logAction({
      adminUserId: createdBy,
      actionType: 'MANUAL_BATCH_CREATE',
      batchId: result.batch.id,
      success: true,
      resultCount: result.blockCount,
      metadata: {
        batchId: result.batch.id,
        textHash,
        blockCount: result.blockCount,
        splitStrategy,
        dedupPolicy,
      },
    });

    this.logger.log(
      `Manual batch created: batchId=${result.batch.id}, pageId=${result.page.id}, blocks=${result.blockCount}`,
    );

    return {
      batchId: result.batch.id,
      pageId: result.page.id,
      blockCount: result.blockCount,
      textHash,
    };
  }
}
