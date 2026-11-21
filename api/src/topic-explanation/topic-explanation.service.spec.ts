import { TopicExplanationService } from './topic-explanation.service';

jest.mock('../ai/ai-router.service', () => ({ AIRouterService: class {} }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('@prisma/client', () => ({
  AITaskType: { TOPIC_EXPLANATION: 'TOPIC_EXPLANATION' },
}));

const card = {
  id: 'card-1',
  approvalStatus: 'APPROVED',
  front: 'Soru?',
  back: 'Cevap.',
  lessonId: 'lesson-1',
  topicId: 'topic-1',
  knowledgePointId: 'kp-1',
  topicExplanation: null,
  lesson: { name: 'Anatomi', displayName: null },
  topic: { name: 'Konu', displayName: null },
  knowledgePoint: {
    fact: 'KP bilgisi',
    approvedContent: { content: 'Onaylı kaynak içerik' },
  },
};

describe('TopicExplanationService', () => {
  it('reuses an approved explanation for the same KP, lesson and topic', async () => {
    const explanation = { id: 'ex-1', status: 'APPROVED' };
    const prisma = {
      flashcard: {
        findUnique: jest.fn().mockResolvedValue(card),
        update: jest.fn().mockResolvedValue({}),
      },
      topicExplanation: { findFirst: jest.fn().mockResolvedValue(explanation) },
    };
    const aiRouter = { runTask: jest.fn() };
    const service = new TopicExplanationService(
      prisma as never,
      aiRouter as never,
      {} as never,
    );
    expect(await service.getOrCreateForCard('card-1')).toEqual(explanation);
    expect(prisma.topicExplanation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          knowledgePointId: 'kp-1',
          lessonId: 'lesson-1',
          topicId: 'topic-1',
          status: 'APPROVED',
        }) as unknown,
      }),
    );
    expect(aiRouter.runTask).not.toHaveBeenCalled();
  });

  it('generates and saves a draft linked to the source flashcard', async () => {
    const explanation = { id: 'ex-new', status: 'DRAFT' };
    const prisma = {
      flashcard: {
        findUnique: jest.fn().mockResolvedValue(card),
        update: jest.fn().mockResolvedValue({}),
      },
      topicExplanation: {
        findFirst: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue(explanation),
      },
    };
    const aiRouter = {
      runTask: jest
        .fn()
        .mockResolvedValue({ title: 'Başlık', content: 'Anlatım' }),
    };
    const service = new TopicExplanationService(
      prisma as never,
      aiRouter as never,
      {} as never,
    );
    expect(await service.getOrCreateForCard('card-1')).toEqual(explanation);
    expect(prisma.topicExplanation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { originFlashcardId: 'card-1' },
        create: expect.objectContaining({
          lessonId: 'lesson-1',
          topicId: 'topic-1',
          knowledgePointId: 'kp-1',
          originFlashcardId: 'card-1',
        }) as unknown,
      }),
    );
    expect(prisma.flashcard.update).toHaveBeenCalledWith({
      where: { id: 'card-1' },
      data: { topicExplanationId: 'ex-new' },
    });
  });

  it('does not show rejected content', async () => {
    const prisma = {
      flashcard: {
        findUnique: jest.fn().mockResolvedValue({
          topicExplanation: { id: 'rejected', status: 'REJECTED' },
        }),
      },
    };
    const service = new TopicExplanationService(
      prisma as never,
      {} as never,
      {} as never,
    );
    expect(await service.getForCard('card-1')).toBeNull();
  });

  it('saves editor changes and approval together', async () => {
    const prisma = {
      topicExplanation: {
        findUnique: jest.fn().mockResolvedValue({ id: 'ex-1' }),
        update: jest.fn().mockResolvedValue({ id: 'ex-1' }),
      },
    };
    const service = new TopicExplanationService(
      prisma as never,
      {} as never,
      {} as never,
    );
    await service.update('ex-1', {
      title: 'Düzeltilmiş başlık',
      content: 'Düzeltilmiş anlatım',
      status: 'APPROVED',
    });
    expect(prisma.topicExplanation.update).toHaveBeenCalledWith({
      where: { id: 'ex-1' },
      data: {
        title: 'Düzeltilmiş başlık',
        content: 'Düzeltilmiş anlatım',
        status: 'APPROVED',
        approvedAt: expect.any(Date) as unknown,
      },
    });
  });

  it('lists only approved explanations linked to approved cards for study', async () => {
    const query = { items: [{ id: 'ex-1', title: 'Başlık' }], total: 1 };
    const prisma = {
      topicExplanation: {
        findMany: jest.fn().mockResolvedValue(query.items),
        count: jest.fn().mockResolvedValue(query.total),
      },
      $transaction: jest
        .fn()
        .mockImplementation(async (operations: Promise<unknown>[]) =>
          Promise.all(operations),
        ),
    };
    const service = new TopicExplanationService(
      prisma as never,
      {} as never,
      {} as never,
    );
    expect(await service.listForStudy('lesson-1', 'topic-1', 2, 20)).toEqual({
      ...query,
      page: 2,
      pageSize: 20,
    });
    expect(prisma.topicExplanation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'APPROVED',
          OR: [
            { flashcards: { some: { approvalStatus: 'APPROVED' } } },
            { originFlashcardId: null },
          ],
          lessonId: 'lesson-1',
          topicId: 'topic-1',
        },
        skip: 20,
        take: 20,
      }),
    );
  });

  it('filters and paginates the admin list', async () => {
    const prisma = {
      topicExplanation: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest
        .fn()
        .mockImplementation(async (operations: Promise<unknown>[]) =>
          Promise.all(operations),
        ),
    };
    const service = new TopicExplanationService(
      prisma as never,
      {} as never,
      {} as never,
    );
    await service.list('DRAFT', 2, 10, {
      lessonId: 'lesson-1',
      topicId: 'topic-1',
      search: 'kalp',
    });
    expect(prisma.topicExplanation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'DRAFT',
          lessonId: 'lesson-1',
          topicId: 'topic-1',
          OR: [
            { title: { contains: 'kalp', mode: 'insensitive' } },
            { content: { contains: 'kalp', mode: 'insensitive' } },
          ],
        },
        skip: 10,
        take: 10,
      }),
    );
  });

  it('creates a manual explanation only under its selected lesson', async () => {
    const prisma = {
      topic: { findFirst: jest.fn().mockResolvedValue({ id: 'topic-1' }) },
      topicExplanation: {
        create: jest.fn().mockResolvedValue({ id: 'ex-new' }),
      },
      $transaction: jest
        .fn()
        .mockImplementation(
          async (callback: (tx: unknown) => Promise<unknown>) =>
            callback(prisma),
        ),
    };
    const service = new TopicExplanationService(
      prisma as never,
      {} as never,
      {} as never,
    );
    await service.create({
      title: ' Başlık ',
      content: ' Anlatım ',
      lessonId: 'lesson-1',
      topicId: 'topic-1',
      status: 'APPROVED',
    });
    expect(prisma.topic.findFirst).toHaveBeenCalledWith({
      where: { id: 'topic-1', lessonId: 'lesson-1', status: 'ACTIVE' },
      select: { id: true },
    });
    expect(prisma.topicExplanation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Başlık',
        content: 'Anlatım',
        status: 'APPROVED',
        approvedAt: expect.any(Date) as unknown,
        imageAssetId: null,
      }) as unknown,
    });
  });

  it('saves an uploaded image with a new explanation', async () => {
    const image = { size: 1234 } as Express.Multer.File;
    const asset = {
      id: 'asset-1',
      originalName: 'diagram.png',
      filePath: '/tmp/diagram.png',
      mimeType: 'image/png',
    };
    const prisma = {
      topic: { findFirst: jest.fn().mockResolvedValue({ id: 'topic-1' }) },
      imageAsset: { create: jest.fn().mockResolvedValue(asset) },
      topicExplanation: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'ex-new', imageAssetId: asset.id }),
      },
      $transaction: jest
        .fn()
        .mockImplementation(
          async (callback: (tx: unknown) => Promise<unknown>) =>
            callback(prisma),
        ),
    };
    const visualAssetService = {
      saveVisualAsset: jest.fn().mockResolvedValue(asset),
      deleteVisualAsset: jest.fn(),
    };
    const service = new TopicExplanationService(
      prisma as never,
      {} as never,
      visualAssetService as never,
    );
    await service.create(
      {
        title: 'Başlık',
        content: 'Anlatım',
        lessonId: 'lesson-1',
        topicId: 'topic-1',
        status: 'DRAFT',
      },
      image,
    );
    expect(prisma.imageAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'asset-1',
        fileSize: 1234,
      }) as unknown,
    });
    expect(prisma.topicExplanation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ imageAssetId: 'asset-1' }) as unknown,
    });
  });

  it('bulk approves only draft explanations', async () => {
    const prisma = {
      topicExplanation: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const service = new TopicExplanationService(
      prisma as never,
      {} as never,
      {} as never,
    );
    expect(await service.bulkApprove(['ex-1', 'ex-2'])).toEqual({
      approved: 2,
    });
    expect(prisma.topicExplanation.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['ex-1', 'ex-2'] }, status: 'DRAFT' },
      data: { status: 'APPROVED', approvedAt: expect.any(Date) as unknown },
    });
  });
});
