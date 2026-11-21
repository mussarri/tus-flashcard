import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AITaskType, Prisma, TopicExplanationStatus } from '@prisma/client';
import { AIRouterService } from '../ai/ai-router.service';
import { PrismaService } from '../prisma/prisma.service';
import { VisualAssetService } from '../common/services/visual-asset.service';

@Injectable()
export class TopicExplanationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRouter: AIRouterService,
    private readonly visualAssetService: VisualAssetService,
  ) {}

  async getForCard(cardId: string) {
    const card = await this.prisma.flashcard.findUnique({
      where: { id: cardId },
      select: { topicExplanation: true },
    });
    if (!card) throw new NotFoundException('Flashcard not found');
    return card.topicExplanation?.status === 'REJECTED'
      ? null
      : card.topicExplanation;
  }

  async getOrCreateForCard(cardId: string) {
    const card = await this.prisma.flashcard.findUnique({
      where: { id: cardId },
      include: {
        topicExplanation: true,
        lesson: { select: { name: true, displayName: true } },
        topic: { select: { name: true, displayName: true } },
        knowledgePoint: {
          select: {
            fact: true,
            lessonId: true,
            topicId: true,
            lesson: { select: { name: true, displayName: true } },
            topic: { select: { name: true, displayName: true } },
            approvedContent: { select: { content: true } },
          },
        },
      },
    });
    if (!card) throw new NotFoundException('Flashcard not found');
    if (card.approvalStatus !== 'APPROVED') {
      throw new BadRequestException('Flashcard is not approved');
    }
    if (card.topicExplanation?.status === 'REJECTED') {
      throw new BadRequestException(
        'Konu anlatımı editör tarafından reddedildi.',
      );
    }
    if (card.topicExplanation) return card.topicExplanation;

    const lessonId = card.lessonId ?? card.knowledgePoint?.lessonId ?? null;
    const topicId = card.topicId ?? card.knowledgePoint?.topicId ?? null;

    if (card.knowledgePointId) {
      const reusable = await this.prisma.topicExplanation.findFirst({
        where: {
          knowledgePointId: card.knowledgePointId,
          lessonId,
          topicId,
          status: 'APPROVED',
        },
        orderBy: { updatedAt: 'desc' },
      });
      if (reusable) {
        await this.prisma.flashcard.update({
          where: { id: cardId },
          data: { topicExplanationId: reusable.id },
        });
        return reusable;
      }
    }

    const raw: unknown = await this.aiRouter.runTask(
      AITaskType.TOPIC_EXPLANATION,
      {
        lesson:
          card.lesson?.displayName ||
          card.lesson?.name ||
          card.knowledgePoint?.lesson?.displayName ||
          card.knowledgePoint?.lesson?.name ||
          null,
        topic:
          card.topic?.displayName ||
          card.topic?.name ||
          card.knowledgePoint?.topic?.displayName ||
          card.knowledgePoint?.topic?.name ||
          null,
        question: card.front,
        answer: card.back,
        knowledgePoint: card.knowledgePoint?.fact || null,
        sourceContent:
          card.knowledgePoint?.approvedContent?.content?.slice(0, 10000) ||
          null,
      },
    );
    const parsed: unknown =
      typeof raw === 'string'
        ? JSON.parse(
            raw
              .trim()
              .replace(/^```(?:json)?\s*/i, '')
              .replace(/\s*```$/, ''),
          )
        : raw;
    const generated = parsed as { title?: unknown; content?: unknown } | null;
    const title =
      typeof generated?.title === 'string' ? generated.title.trim() : '';
    const content =
      typeof generated?.content === 'string' ? generated.content.trim() : '';
    if (!title || !content) {
      throw new BadRequestException(
        'Konu anlatımı için yeterli kaynak bulunamadı.',
      );
    }

    const explanation = await this.prisma.topicExplanation.upsert({
      where: { originFlashcardId: cardId },
      create: {
        title: title.slice(0, 200),
        content,
        lessonId,
        topicId,
        knowledgePointId: card.knowledgePointId,
        originFlashcardId: cardId,
      },
      update: {},
    });
    await this.prisma.flashcard.update({
      where: { id: cardId },
      data: { topicExplanationId: explanation.id },
    });
    return explanation;
  }

  async list(
    status?: TopicExplanationStatus,
    page = 1,
    pageSize = 20,
    filters: { lessonId?: string; topicId?: string; search?: string } = {},
  ) {
    const where: Prisma.TopicExplanationWhereInput = {
      ...(status ? { status } : {}),
      ...(filters.lessonId ? { lessonId: filters.lessonId } : {}),
      ...(filters.topicId ? { topicId: filters.topicId } : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { content: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.topicExplanation.findMany({
        where,
        include: {
          lesson: { select: { name: true, displayName: true } },
          topic: { select: { name: true, displayName: true } },
          knowledgePoint: { select: { fact: true } },
          _count: { select: { flashcards: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.topicExplanation.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async adminCatalog() {
    const [lessons, topics] = await Promise.all([
      this.prisma.lesson.findMany({
        select: { id: true, name: true, displayName: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.topic.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, lessonId: true, name: true, displayName: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return { lessons, topics };
  }

  async create(
    input: {
      title: string;
      content: string;
      lessonId: string;
      topicId: string;
      status: 'DRAFT' | 'APPROVED';
    },
    image?: Express.Multer.File,
  ) {
    const topic = await this.prisma.topic.findFirst({
      where: { id: input.topicId, lessonId: input.lessonId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!topic)
      throw new BadRequestException(
        'Topic does not belong to the selected lesson',
      );
    const asset = image
      ? await this.visualAssetService.saveVisualAsset(image)
      : null;
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (asset) {
          await tx.imageAsset.create({
            data: {
              id: asset.id,
              fileName: asset.originalName,
              filePath: asset.filePath,
              mimeType: asset.mimeType,
              fileSize: image!.size,
            },
          });
        }
        return tx.topicExplanation.create({
          data: {
            title: input.title.trim().slice(0, 200),
            content: input.content.trim(),
            lessonId: input.lessonId,
            topicId: input.topicId,
            status: input.status,
            approvedAt: input.status === 'APPROVED' ? new Date() : null,
            imageAssetId: asset?.id ?? null,
          },
        });
      });
    } catch (error) {
      if (asset) await this.visualAssetService.deleteVisualAsset(asset.id);
      throw error;
    }
  }

  async bulkApprove(ids: string[]) {
    const result = await this.prisma.topicExplanation.updateMany({
      where: { id: { in: ids }, status: 'DRAFT' },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
    return { approved: result.count };
  }

  async studyCatalog() {
    const visible = {
      status: 'APPROVED' as const,
      OR: [
        { flashcards: { some: { approvalStatus: 'APPROVED' as const } } },
        { originFlashcardId: null },
      ],
    };
    const [lessons, topics] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { topicExplanations: { some: visible } },
        select: { id: true, name: true, displayName: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.topic.findMany({
        where: { topicExplanations: { some: visible } },
        select: { id: true, lessonId: true, name: true, displayName: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return { lessons, topics };
  }

  async listForStudy(
    lessonId?: string,
    topicId?: string,
    page = 1,
    pageSize = 20,
  ) {
    const where: Prisma.TopicExplanationWhereInput = {
      status: 'APPROVED' as const,
      OR: [
        { flashcards: { some: { approvalStatus: 'APPROVED' as const } } },
        { originFlashcardId: null },
      ],
      ...(lessonId ? { lessonId } : {}),
      ...(topicId ? { topicId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.topicExplanation.findMany({
        where,
        select: {
          id: true,
          title: true,
          content: true,
          imageAssetId: true,
          status: true,
          lessonId: true,
          topicId: true,
          lesson: { select: { name: true, displayName: true } },
          topic: { select: { name: true, displayName: true } },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.topicExplanation.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async update(
    id: string,
    input: {
      title?: string;
      content?: string;
      status?: TopicExplanationStatus;
    },
  ) {
    const existing = await this.prisma.topicExplanation.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Topic explanation not found');
    if (input.title !== undefined && !input.title.trim()) {
      throw new BadRequestException('Title cannot be empty');
    }
    if (input.content !== undefined && !input.content.trim()) {
      throw new BadRequestException('Content cannot be empty');
    }
    return this.prisma.topicExplanation.update({
      where: { id },
      data: {
        ...(input.title !== undefined
          ? { title: input.title.trim().slice(0, 200) }
          : {}),
        ...(input.content !== undefined
          ? { content: input.content.trim() }
          : {}),
        ...(input.status !== undefined
          ? {
              status: input.status,
              approvedAt: input.status === 'APPROVED' ? new Date() : null,
            }
          : {}),
      },
    });
  }
}
