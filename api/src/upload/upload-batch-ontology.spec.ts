import { UploadService } from './upload.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('batch ontology update', () => {
  it('updates the batch and its active blocks in one transaction', async () => {
    const tx = {
      topic: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'topic-2',
          name: 'Yeni konu',
          lesson: { name: 'Yeni ders' },
        }),
      },
      knowledgePoint: { findMany: jest.fn().mockResolvedValue([]) },
      approvedContent: { count: jest.fn().mockResolvedValue(0) },
      parsedBlock: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      uploadBatch: { update: jest.fn().mockResolvedValue({ id: 'batch-1' }) },
    };
    const prisma = {
      uploadBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      },
      $transaction: jest
        .fn()
        .mockImplementation((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
    };
    const service = { prisma, logger: { error: jest.fn() } };

    await UploadService.prototype.updateBatch.call(
      service as never,
      'batch-1',
      {
        lessonId: 'lesson-2',
        topicId: 'topic-2',
      },
    );

    expect(tx.topic.findFirst).toHaveBeenCalledWith({
      where: { id: 'topic-2', lessonId: 'lesson-2' },
      select: { id: true, name: true, lesson: { select: { name: true } } },
    });
    expect(tx.parsedBlock.updateMany).toHaveBeenCalledWith({
      where: { page: { batchId: 'batch-1' }, deletedAt: null },
      data: { lessonId: 'lesson-2', topicId: 'topic-2', subtopicId: null },
    });
    expect(tx.uploadBatch.update).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      data: { lessonId: 'lesson-2', topicId: 'topic-2', subtopicId: null },
    });
  });

  it('moves generated KPs and cards and returns them to review', async () => {
    const tx = {
      topic: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'topic-2',
          name: 'Yeni konu',
          lesson: { name: 'Yeni ders' },
        }),
      },
      knowledgePoint: {
        findMany: jest.fn().mockResolvedValue([{ id: 'kp-1', fact: 'Bilgi' }]),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      approvedContent: { count: jest.fn().mockResolvedValue(0) },
      parsedBlock: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      flashcard: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'card-1',
            cardType: 'SPOT',
            front: 'Soru?',
            uniqueKey: 'old-key',
          },
        ]),
        update: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      topicExplanation: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      questionCard: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      uploadBatch: { update: jest.fn().mockResolvedValue({ id: 'batch-1' }) },
    };
    const prisma = {
      uploadBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      },
      $transaction: jest
        .fn()
        .mockImplementation((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
    };
    const service = { prisma, logger: { error: jest.fn() } };

    await UploadService.prototype.updateBatch.call(
      service as never,
      'batch-1',
      {
        lessonId: 'lesson-2',
        topicId: 'topic-2',
      },
    );
    expect(tx.parsedBlock.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.knowledgePoint.update).toHaveBeenCalledWith({
      where: { id: 'kp-1' },
      data: expect.objectContaining({
        lessonId: 'lesson-2',
        topicId: 'topic-2',
        approvalStatus: 'PENDING',
        rejectionReason: null,
      }) as unknown,
    });
    expect(tx.flashcard.update).toHaveBeenCalledWith({
      where: { id: 'card-1' },
      data: expect.objectContaining({
        lessonId: 'lesson-2',
        topicId: 'topic-2',
        approvalStatus: 'PENDING',
        uniqueKey: expect.any(String) as unknown,
      }) as unknown,
    });
    expect(tx.topicExplanation.updateMany).toHaveBeenCalledWith({
      where: { knowledgePointId: { in: ['kp-1'] } },
      data: {
        lessonId: 'lesson-2',
        topicId: 'topic-2',
        status: 'DRAFT',
        approvedAt: null,
      },
    });
    expect(tx.questionCard.updateMany).toHaveBeenCalledWith({
      where: {
        questionKnowledgePoints: {
          some: { knowledgePointId: { in: ['kp-1'] } },
        },
      },
      data: { approvalStatus: 'PENDING', approvedAt: null, approvedBy: null },
    });
  });

  it('waits for an in-flight extraction before changing ontology', async () => {
    const tx = {
      topic: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'topic-2',
          name: 'Yeni konu',
          lesson: { name: 'Yeni ders' },
        }),
      },
      approvedContent: { count: jest.fn().mockResolvedValue(1) },
      parsedBlock: { updateMany: jest.fn() },
    };
    const prisma = {
      uploadBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      },
      $transaction: jest
        .fn()
        .mockImplementation((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
    };
    const service = { prisma, logger: { error: jest.fn() } };
    await expect(
      UploadService.prototype.updateBatch.call(service as never, 'batch-1', {
        lessonId: 'lesson-2',
        topicId: 'topic-2',
      }),
    ).rejects.toThrow('KP çıkarımı sürerken');
    expect(tx.parsedBlock.updateMany).not.toHaveBeenCalled();
  });

  it('does not move the batch when a KP key exists in the target topic', async () => {
    const tx = {
      topic: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'topic-2',
          name: 'Yeni konu',
          lesson: { name: 'Yeni ders' },
        }),
      },
      approvedContent: { count: jest.fn().mockResolvedValue(0) },
      knowledgePoint: {
        findMany: jest.fn().mockResolvedValue([{ id: 'kp-1', fact: 'Bilgi' }]),
        findFirst: jest.fn().mockResolvedValue({ id: 'other-kp' }),
      },
      parsedBlock: { updateMany: jest.fn() },
    };
    const prisma = {
      uploadBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      },
      $transaction: jest
        .fn()
        .mockImplementation((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
    };
    const service = { prisma, logger: { error: jest.fn() } };
    await expect(
      UploadService.prototype.updateBatch.call(service as never, 'batch-1', {
        lessonId: 'lesson-2',
        topicId: 'topic-2',
      }),
    ).rejects.toThrow('aynı KP zaten mevcut');
    expect(tx.parsedBlock.updateMany).not.toHaveBeenCalled();
  });
});
