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
    const service = new TopicExplanationService(prisma as never, {} as never);
    expect(await service.getForCard('card-1')).toBeNull();
  });

  it('saves editor changes and approval together', async () => {
    const prisma = {
      topicExplanation: {
        findUnique: jest.fn().mockResolvedValue({ id: 'ex-1' }),
        update: jest.fn().mockResolvedValue({ id: 'ex-1' }),
      },
    };
    const service = new TopicExplanationService(prisma as never, {} as never);
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
});
