import { UploadService } from './upload.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('batch lesson filtering', () => {
  it('queries batch hints, classified blocks, and topics belonging to the lesson', async () => {
    const prisma = {
      topic: {
        findMany: jest.fn().mockResolvedValue([{ id: 'topic-1' }]),
      },
      uploadBatch: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = { prisma, logger: { debug: jest.fn() } };

    await UploadService.prototype.getAllBatches.call(
      service as never,
      'lesson-1',
    );

    expect(prisma.topic.findMany).toHaveBeenCalledWith({
      where: { lessonId: 'lesson-1' },
      select: { id: true },
    });
    expect(prisma.uploadBatch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { lessonId: 'lesson-1' },
            {
              pages: {
                some: {
                  blocks: {
                    some: { lessonId: 'lesson-1', deletedAt: null },
                  },
                },
              },
            },
            { topicId: { in: ['topic-1'] } },
          ],
        },
      }),
    );
  });
});
