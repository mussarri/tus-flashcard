/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { ManualBatchService } from '../src/upload/manual-batch.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditLogService } from '../src/common/services/audit-log.service';
import { DedupPolicy } from '../src/upload/dto/create-manual-batch.dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockPrisma() {
  const mockTx = {
    uploadBatch: {
      create: jest.fn(),
      update: jest.fn(),
    },
    uploadPage: {
      create: jest.fn(),
    },
    parsedBlock: {
      createMany: jest.fn(),
    },
  };

  return {
    uploadPage: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<any>) =>
      cb(mockTx),
    ),
    _tx: mockTx, // expose for assertions
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ManualBatchService', () => {
  let service: ManualBatchService;
  let prisma: ReturnType<typeof makeMockPrisma>;
  let auditLog: { logAction: jest.Mock };

  const defaultInput = {
    title: 'Test Anatomy Batch',
    lessonId: 'lesson-1',
    topicId: 'topic-1',
    subtopicId: undefined,
    rawText: '- Fact one\n- Fact two\n- Fact three',
    splitStrategy: 'BULLETS' as const,
    dedupPolicy: DedupPolicy.REJECT_IF_DUPLICATE,
  };

  beforeEach(async () => {
    prisma = makeMockPrisma();
    auditLog = { logAction: jest.fn().mockResolvedValue(undefined) };

    // Default transaction mocks
    prisma._tx.uploadBatch.create.mockResolvedValue({
      id: 'batch-123',
      topic: defaultInput.title,
      createdBy: 'admin-user-id',
      status: 'UPLOADED',
      sourceType: 'MANUAL_TEXT',
    });
    prisma._tx.uploadPage.create.mockResolvedValue({
      id: 'page-456',
      batchId: 'batch-123',
      pageNumber: 1,
      fileType: 'TEXT',
      ocrStatus: 'COMPLETED',
    });
    prisma._tx.parsedBlock.createMany.mockResolvedValue({ count: 3 });
    prisma._tx.uploadBatch.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManualBatchService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get<ManualBatchService>(ManualBatchService);
  });

  // -------------------------------------------------------------------------
  describe('Successful creation', () => {
    it('creates batch + page + blocks and returns correct counts', async () => {
      prisma.uploadPage.findFirst.mockResolvedValue(null);

      const result = await service.createManualBatch(defaultInput);

      expect(result.batchId).toBe('batch-123');
      expect(result.pageId).toBe('page-456');
      expect(result.blockCount).toBe(3); // 3 bullet items
      expect(typeof result.textHash).toBe('string');
      expect(result.textHash).toHaveLength(64); // sha256 hex
    });

    it('creates parsedBlocks with PENDING approvalStatus', async () => {
      prisma.uploadPage.findFirst.mockResolvedValue(null);

      await service.createManualBatch(defaultInput);

      const callArgs = prisma._tx.parsedBlock.createMany.mock.calls[0][0];
      const blockData = callArgs.data as any[];

      expect(blockData.length).toBe(3);
      blockData.forEach((block: any, i: number) => {
        expect(block.approvalStatus).toBe('PENDING');
        expect(block.blockIndex).toBe(i);
        expect(block.classificationStatus).toBe('CLASSIFIED');
        expect(block.blockType).toBe('TEXT');
        expect(block.confidence).toBe(1.0);
      });
    });

    it('sets batch status to CLASSIFIED after blocks created', async () => {
      prisma.uploadPage.findFirst.mockResolvedValue(null);

      await service.createManualBatch(defaultInput);

      expect(prisma._tx.uploadBatch.update).toHaveBeenCalledWith({
        where: { id: 'batch-123' },
        data: { status: 'CLASSIFIED' },
      });
    });

    it('sets fileType=TEXT and ocrStatus=COMPLETED on the page', async () => {
      prisma.uploadPage.findFirst.mockResolvedValue(null);

      await service.createManualBatch(defaultInput);

      const pageCreateCall = prisma._tx.uploadPage.create.mock.calls[0][0];
      expect(pageCreateCall.data.fileType).toBe('TEXT');
      expect(pageCreateCall.data.ocrStatus).toBe('COMPLETED');
      expect(pageCreateCall.data.filePath).toBeNull();
    });

    it('stores normalizedText and textHash on the page', async () => {
      prisma.uploadPage.findFirst.mockResolvedValue(null);

      const result = await service.createManualBatch(defaultInput);

      const pageCreateCall = prisma._tx.uploadPage.create.mock.calls[0][0];
      expect(pageCreateCall.data.textHash).toBe(result.textHash);
      expect(typeof pageCreateCall.data.rawText).toBe('string');
    });

    it('sets sourceType=MANUAL_TEXT on the batch', async () => {
      prisma.uploadPage.findFirst.mockResolvedValue(null);

      await service.createManualBatch(defaultInput);

      const batchCreateCall = prisma._tx.uploadBatch.create.mock.calls[0][0];
      expect(batchCreateCall.data.sourceType).toBe('MANUAL_TEXT');
    });

    it('writes an audit log entry with correct metadata', async () => {
      prisma.uploadPage.findFirst.mockResolvedValue(null);

      const result = await service.createManualBatch(defaultInput);

      expect(auditLog.logAction).toHaveBeenCalledTimes(1);
      const logCall = auditLog.logAction.mock.calls[0][0];
      expect(logCall.actionType).toBe('MANUAL_BATCH_CREATE');
      expect(logCall.batchId).toBe(result.batchId);
      expect(logCall.metadata.blockCount).toBe(3);
      expect(logCall.metadata.splitStrategy).toBe('BULLETS');
      expect(logCall.metadata.dedupPolicy).toBe(
        DedupPolicy.REJECT_IF_DUPLICATE,
      );
      expect(logCall.metadata.textHash).toBe(result.textHash);
    });
  });

  // -------------------------------------------------------------------------
  describe('Deduplication', () => {
    it('returns 409 ConflictException when duplicate exists with REJECT_IF_DUPLICATE', async () => {
      prisma.uploadPage.findFirst.mockResolvedValue({
        id: 'page-existing',
        batchId: 'batch-existing-999',
      });

      await expect(
        service.createManualBatch({
          ...defaultInput,
          dedupPolicy: DedupPolicy.REJECT_IF_DUPLICATE,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('includes the existingBatchId in the conflict response', async () => {
      prisma.uploadPage.findFirst.mockResolvedValue({
        id: 'page-existing',
        batchId: 'batch-existing-999',
      });

      try {
        await service.createManualBatch({
          ...defaultInput,
          dedupPolicy: DedupPolicy.REJECT_IF_DUPLICATE,
        });
        fail('Expected ConflictException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ConflictException);
        expect(err.getResponse().existingBatchId).toBe('batch-existing-999');
      }
    });

    it('allows duplicate when ALLOW_DUPLICATE', async () => {
      prisma.uploadPage.findFirst.mockResolvedValue({
        id: 'page-existing',
        batchId: 'batch-existing-999',
      });

      // Should NOT throw even though findFirst returns a result
      const result = await service.createManualBatch({
        ...defaultInput,
        dedupPolicy: DedupPolicy.ALLOW_DUPLICATE,
      });

      expect(result.batchId).toBe('batch-123');
    });
  });

  // -------------------------------------------------------------------------
  describe('Validation', () => {
    it('throws BadRequestException for empty rawText', async () => {
      await expect(
        service.createManualBatch({ ...defaultInput, rawText: '   ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when split produces 0 chunks', async () => {
      prisma.uploadPage.findFirst.mockResolvedValue(null);
      // All whitespace lines → splitByLines returns []
      await expect(
        service.createManualBatch({ ...defaultInput, rawText: '\n\n\n' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  describe('Block indices', () => {
    it('assigns sequential blockIndex starting from 0', async () => {
      prisma.uploadPage.findFirst.mockResolvedValue(null);
      prisma._tx.parsedBlock.createMany.mockResolvedValue({ count: 3 });

      await service.createManualBatch(defaultInput);

      const { data } = prisma._tx.parsedBlock.createMany.mock.calls[0][0];
      expect(data.map((b: any) => b.blockIndex)).toEqual([0, 1, 2]);
    });
  });
});
