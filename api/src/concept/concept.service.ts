/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Concept,
  ConceptAlias,
  ConceptType,
  ConceptStatus,
  AliasLanguage,
  AliasSource,
  Prisma,
} from '@prisma/client';
import { normalizeConceptKey } from '../common/normalize/normalize-concept-key';

@Injectable()
export class ConceptService {
  constructor(private prisma: PrismaService) {}

  async resolveConcepts(hints: string[]): Promise<Concept[]> {
    if (!hints || hints.length === 0) return [];

    const normalized = hints.map((h) => normalizeConceptKey(h));

    const concepts = await this.prisma.concept.findMany({
      where: {
        status: ConceptStatus.ACTIVE,
        OR: [
          { normalizedLabel: { in: normalized } },
          {
            aliases: {
              some: {
                normalizedAlias: { in: normalized },
                isActive: true,
              },
            },
          },
        ],
      },
      include: {
        aliases: {
          where: { isActive: true },
        },
      },
    });

    return concepts;
  }

  async getAllConcepts(params?: {
    search?: string;
    type?: ConceptType;
    status?: ConceptStatus;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.ConceptWhereInput = {};

    if (params?.search) {
      where.OR = [
        { preferredLabel: { contains: params.search, mode: 'insensitive' } },
        { normalizedLabel: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params?.type) {
      where.conceptType = params.type;
    }

    if (params?.status) {
      where.status = params.status;
    } else {
      where.status = { not: ConceptStatus.MERGED };
    }

    // Dynamic sorting
    let orderBy: Prisma.ConceptOrderByWithRelationInput = { createdAt: 'desc' };
    const sortOrder = params?.sortOrder || 'desc';

    if (params?.sortBy) {
      switch (params.sortBy) {
        case 'preferredLabel':
          orderBy = { preferredLabel: sortOrder };
          break;
        case 'conceptType':
          orderBy = { conceptType: sortOrder };
          break;
        case 'status':
          orderBy = { status: sortOrder };
          break;
        case 'createdAt':
          orderBy = { createdAt: sortOrder };
          break;
        case 'updatedAt':
          orderBy = { updatedAt: sortOrder };
          break;
        case 'prerequisiteCount':
          orderBy = { prerequisites: { _count: sortOrder } };
          break;
        case 'questionCount':
          orderBy = { questions: { _count: sortOrder } };
          break;
        default:
          orderBy = { createdAt: 'desc' };
      }
    }

    const [concepts, total] = await Promise.all([
      this.prisma.concept.findMany({
        where,
        include: {
          aliases: { where: { isActive: true } },
          prerequisites: true,
          questions: true,
          _count: {
            select: {
              aliases: { where: { isActive: true } },
              prerequisites: true,
              questions: true,
            },
          },
        },
        orderBy,
        take: params?.limit || 100,
        skip: params?.offset || 0,
      }),
      this.prisma.concept.count({ where }),
    ]);

    return {
      concepts: concepts.map((c) => ({
        ...c,
        aliasCount: c._count.aliases,
        prerequisiteCount: c._count.prerequisites,
        questionCount: c._count.questions,
      })),
      total,
    };
  }

  async getConceptById(id: string) {
    const concept = await this.prisma.concept.findUnique({
      where: { id },
      include: {
        aliases: {
          orderBy: { usageCount: 'desc' },
        },
        prerequisites: {
          include: {
            prerequisite: {
              include: {
                edges: {
                  include: {
                    topic: true,
                  },
                },
              },
            },
          },
        },
        questions: {
          include: {
            question: {
              select: {
                id: true,
                year: true,
                question: true,
                lesson: true,
                topic: true,
                subtopic: true,
              },
            },
          },
        },
        subtopic: {
          include: {
            topic: true,
          },
        },
        _count: {
          select: {
            aliases: true,
            prerequisites: true,
            questions: true,
          },
        },
      },
    });

    if (!concept) {
      throw new NotFoundException(`Concept ${id} not found`);
    }

    const topicFrequency = await this.prisma.examQuestion.groupBy({
      by: ['topicId'],
      where: {
        analysisStatus: 'ANALYZED',
        concepts: {
          some: {
            conceptId: concept.id,
          },
        },
        topicId: { not: null },
      },
      _count: {
        _all: true,
      },
    });
    const topics = await this.prisma.topic.findMany({
      where: {
        id: {
          in: topicFrequency
            .map((t) => t.topicId)
            .filter((id): id is string => id !== null),
        },
      },
      select: {
        id: true,
        name: true,
        lesson: {
          select: { id: true, displayName: true },
        },
      },
    });

    const result = topicFrequency.map((tf) => ({
      topicId: tf.topicId,
      topicName: topics.find((t) => t.id === tf.topicId)?.name,
      lesson: topics
        .find((t) => t.id === tf.topicId)
        ?.lesson?.displayName?.split(' - ')[0],
      questionCount: tf._count._all,
    }));

    // Map prerequisites to frontend format
    const prerequisites = concept.prerequisites.map((prereq) => ({
      id: prereq.id,
      prerequisiteId: prereq.prerequisiteId,
      canonicalLabel: prereq.prerequisite.name,
      role: 'PRIMARY' as const, // Default value, schema doesn't have this field yet
      edgeStrength: 'MEDIUM' as const, // Default value, schema doesn't have this field yet
      topicCoverage: 0, // Default value, schema doesn't have this field yet
      createdAt: prereq.createdAt.toISOString(),
    }));
    // Map questions to frontend format
    const questions = concept.questions.map((qc) => ({
      id: qc.id,
      questionId: qc.questionId,
      questionText: qc.question.question,
      year: qc.question.year,
      topic: qc.question.topic,
      difficulty: 1, // Default value, schema doesn't have this field
      createdAt: qc.createdAt.toISOString(),
    }));

    return {
      id: concept.id,
      preferredLabel: concept.preferredLabel,
      normalizedKey: concept.normalizedLabel,
      conceptType: concept.conceptType,
      status: concept.status,
      aliases: concept.aliases,
      prerequisites,
      questions,
      topics: result,
      createdAt: concept.createdAt.toISOString(),
      updatedAt: concept.updatedAt.toISOString(),
      aliasCount: concept._count.aliases,
      prerequisiteCount: concept._count.prerequisites,
      questionCount: concept._count.questions,
    };
  }

  async createConcept(data: {
    preferredLabel: string;
    conceptType?: ConceptType;
    description?: string;
  }): Promise<Concept> {
    const normalizedLabel = normalizeConceptKey(data.preferredLabel);

    const existing = await this.prisma.concept.findUnique({
      where: { normalizedLabel },
    });

    if (existing) {
      throw new BadRequestException(
        `Concept with label "${data.preferredLabel}" already exists`,
      );
    }

    const concept = await this.prisma.concept.create({
      data: {
        preferredLabel: data.preferredLabel,
        normalizedLabel,
        conceptType: data.conceptType || ConceptType.STRUCTURE,
        description: data.description,
        aliases: {
          create: {
            alias: data.preferredLabel,
            normalizedAlias: normalizedLabel,
            language: AliasLanguage.EN,
            source: AliasSource.ADMIN,
          },
        },
      },
      include: {
        aliases: true,
      },
    });

    return concept;
  }

  async updateConcept(
    id: string,
    data: {
      preferredLabel?: string;
      conceptType?: ConceptType;
      description?: string;
      status?: ConceptStatus;
    },
  ): Promise<Concept> {
    const concept = await this.prisma.concept.findUnique({ where: { id } });
    if (!concept) {
      throw new NotFoundException(`Concept ${id} not found`);
    }

    const updateData: Prisma.ConceptUpdateInput = {};

    if (data.preferredLabel) {
      const normalizedLabel = normalizeConceptKey(data.preferredLabel);
      const existing = await this.prisma.concept.findFirst({
        where: {
          normalizedLabel,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Concept with label "${data.preferredLabel}" already exists`,
        );
      }

      updateData.preferredLabel = data.preferredLabel;
      updateData.normalizedLabel = normalizedLabel;
    }

    if (data.conceptType) updateData.conceptType = data.conceptType;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.status) updateData.status = data.status;

    return this.prisma.concept.update({
      where: { id },
      data: updateData,
      include: {
        aliases: true,
      },
    });
  }

  async addAlias(
    conceptId: string,
    data: {
      alias: string;
      language?: AliasLanguage;
      source?: AliasSource;
    },
  ): Promise<ConceptAlias> {
    const concept = await this.prisma.concept.findUnique({
      where: { id: conceptId },
    });

    if (!concept) {
      throw new NotFoundException(`Concept ${conceptId} not found`);
    }

    const normalizedAlias = normalizeConceptKey(data.alias);

    const existing = await this.prisma.conceptAlias.findUnique({
      where: { normalizedAlias },
    });

    if (existing) {
      throw new BadRequestException(
        `Alias "${data.alias}" already exists for another concept`,
      );
    }

    return this.prisma.conceptAlias.create({
      data: {
        conceptId,
        alias: data.alias,
        normalizedAlias,
        language: data.language || AliasLanguage.EN,
        source: data.source || AliasSource.ADMIN,
      },
    });
  }

  async disableAlias(conceptId: string, aliasId: string): Promise<void> {
    const alias = await this.prisma.conceptAlias.findUnique({
      where: { id: aliasId },
    });

    if (!alias || alias.conceptId !== conceptId) {
      throw new NotFoundException(
        `Alias ${aliasId} not found for concept ${conceptId}`,
      );
    }

    await this.prisma.conceptAlias.update({
      where: { id: aliasId },
      data: { isActive: false },
    });
  }

  async mergeConcepts(sourceId: string, targetId: string): Promise<void> {
    if (sourceId === targetId) {
      throw new BadRequestException('Cannot merge a concept into itself');
    }

    const [source, target] = await Promise.all([
      this.prisma.concept.findUnique({
        where: { id: sourceId },
        include: { aliases: true },
      }),
      this.prisma.concept.findUnique({ where: { id: targetId } }),
    ]);

    if (!source || !target) {
      throw new NotFoundException('Source or target concept not found');
    }

    if (source.status === ConceptStatus.MERGED) {
      throw new BadRequestException('Source concept is already merged');
    }

    if (target.status === ConceptStatus.MERGED) {
      throw new BadRequestException(
        'Target concept is merged, cannot merge into it',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const alias of source.aliases) {
        const targetHasSameAlias = await tx.conceptAlias.findUnique({
          where: { normalizedAlias: alias.normalizedAlias },
        });

        if (targetHasSameAlias && targetHasSameAlias.conceptId === targetId) {
          await tx.conceptAlias.update({
            where: { id: targetHasSameAlias.id },
            data: {
              usageCount: {
                increment: alias.usageCount,
              },
            },
          });
          await tx.conceptAlias.delete({ where: { id: alias.id } });
        } else if (!targetHasSameAlias) {
          await tx.conceptAlias.update({
            where: { id: alias.id },
            data: { conceptId: targetId },
          });
        } else {
          await tx.conceptAlias.delete({ where: { id: alias.id } });
        }
      }

      await tx.prerequisiteConcept.updateMany({
        where: { conceptId: sourceId },
        data: { conceptId: targetId },
      });

      await tx.questionConcept.updateMany({
        where: { conceptId: sourceId },
        data: { conceptId: targetId },
      });

      await tx.concept.update({
        where: { id: sourceId },
        data: {
          status: ConceptStatus.MERGED,
          mergedIntoId: targetId,
        },
      });
    });
  }

  async getMergePreview(sourceId: string, targetId: string) {
    const [source, target] = await Promise.all([
      this.prisma.concept.findUnique({
        where: { id: sourceId },
        include: {
          aliases: { where: { isActive: true } },
          _count: {
            select: {
              prerequisites: true,
              questions: true,
            },
          },
        },
      }),
      this.prisma.concept.findUnique({ where: { id: targetId } }),
    ]);

    if (!source || !target) {
      throw new NotFoundException('Source or target concept not found');
    }

    return {
      aliasesToMigrate: source.aliases.map((a) => a.alias),
      prerequisitesToMigrate: source._count.prerequisites,
      questionsToMigrate: source._count.questions,
    };
  }

  async searchConcepts(query: string) {
    const normalized = normalizeConceptKey(query);

    const concepts = await this.prisma.concept.findMany({
      where: {
        status: { not: ConceptStatus.MERGED },
        OR: [
          { preferredLabel: { contains: query, mode: 'insensitive' } },
          { normalizedLabel: { contains: normalized } },
          {
            aliases: {
              some: {
                alias: { contains: query, mode: 'insensitive' },
                isActive: true,
              },
            },
          },
        ],
      },
      include: {
        _count: {
          select: {
            aliases: { where: { isActive: true } },
            prerequisites: true,
            questions: true,
          },
        },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    return concepts.map((c) => ({
      ...c,
      aliasCount: c._count.aliases,
      prerequisiteCount: c._count.prerequisites,
      questionCount: c._count.questions,
    }));
  }

  async incrementAliasUsage(normalizedAlias: string): Promise<void> {
    await this.prisma.conceptAlias.updateMany({
      where: { normalizedAlias },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });
  }
}
