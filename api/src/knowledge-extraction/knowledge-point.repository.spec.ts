import { KnowledgePointRepository } from './knowledge-point.repository';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('KnowledgePointRepository replacement', () => {
  it('deletes old content points and writes new ones in one transaction', async () => {
    const operations: string[] = [];
    const tx = {
      knowledgePoint: {
        deleteMany: jest.fn().mockImplementation(() => {
          operations.push('delete');
          return { count: 1 };
        }),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(() => {
          operations.push('create');
          return { id: 'new' };
        }),
      },
    };
    const prisma = {
      $transaction: jest
        .fn()
        .mockImplementation((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
    };
    const repository = new KnowledgePointRepository(prisma as never);

    await repository.persistForApprovedContent({
      approvedContentId: 'approved-1',
      blockId: 'block-1',
      lessonId: 'lesson-1',
      replaceExisting: true,
      candidates: [
        {
          normalizedKey: 'key-1',
          fact: 'Yeni bilgi',
          priority: 8,
          examRelevance: 0.9,
          classificationConfidence: 0.9,
        },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(operations).toEqual(['delete', 'create']);
    expect(tx.knowledgePoint.deleteMany).toHaveBeenCalledWith({
      where: { approvedContentId: 'approved-1' },
    });
  });
});
