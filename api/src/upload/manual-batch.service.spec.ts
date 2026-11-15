import { ManualBatchService } from './manual-batch.service';
import { DedupPolicy } from './dto/create-manual-batch.dto';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('@prisma/client', () => ({
  ContentType: { MIXED_CONTENT: 'MIXED_CONTENT' },
  AITaskType: { CONTENT_CLASSIFY: 'CONTENT_CLASSIFY' },
  AIProviderType: {},
  Prisma: {},
}));

describe('ManualBatchService content boundaries', () => {
  it('saves each separated content as its own classified block', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const tx = {
      uploadBatch: {
        create: jest.fn().mockResolvedValue({ id: 'batch-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      uploadPage: {
        create: jest.fn().mockResolvedValue({ id: 'page-1' }),
      },
      parsedBlock: { createMany },
    };
    const prisma = {
      $transaction: (callback: (value: typeof tx) => Promise<unknown>) =>
        callback(tx),
    };
    const audit = { logAction: jest.fn().mockResolvedValue(undefined) };
    const ai = {
      runTask: jest
        .fn()
        .mockResolvedValueOnce({
          blocks: [{ type: 'TEXT', content: 'First content' }],
        })
        .mockResolvedValueOnce({
          blocks: [
            {
              type: 'ALGORITHM',
              content: '1. Second content',
              algorithmData: { steps: [{ action: 'Second content' }] },
            },
          ],
        }),
    };
    const service = new ManualBatchService(
      prisma as never,
      audit as never,
      ai as never,
    );

    const result = await service.createManualBatch({
      title: 'Notes',
      lessonId: 'lesson-1',
      topicId: 'topic-1',
      rawText: 'First content\n---\nSecond content',
      dedupPolicy: DedupPolicy.ALLOW_DUPLICATE,
    });

    expect(ai.runTask.mock.calls.map((call) => call[1].content)).toEqual([
      'First content',
      'Second content',
    ]);
    expect(createMany.mock.calls[0][0].data).toEqual([
      expect.objectContaining({
        blockIndex: 0,
        blockType: 'TEXT',
        rawText: 'First content',
      }),
      expect.objectContaining({
        blockIndex: 1,
        blockType: 'ALGORITHM',
        rawText: '1. Second content',
      }),
    ]);
    expect(tx.uploadPage.create.mock.calls[0][0].data.rawText).toBe(
      'First content\n---\nSecond content',
    );
    expect(result.blockCount).toBe(2);
  });
});
