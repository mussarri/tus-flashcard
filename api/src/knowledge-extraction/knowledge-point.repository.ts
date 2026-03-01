import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeneratedKnowledgePointCandidate } from './knowledge-point.types';

export interface PersistKnowledgePointsParams {
  approvedContentId: string;
  blockId: string;
  lessonId: string;
  topicId?: string | null;
  subtopicId?: string | null;
  candidates: Array<
    GeneratedKnowledgePointCandidate & { normalizedKey: string }
  >;
  chunkSize?: number;
}

export interface PersistKnowledgePointsResult {
  created: number;
  updated: number;
  sourceCountIncremented: number;
}

@Injectable()
export class KnowledgePointRepository {
  constructor(private readonly prisma: PrismaService) {}

  async persistForApprovedContent(
    params: PersistKnowledgePointsParams,
  ): Promise<PersistKnowledgePointsResult> {
    const {
      approvedContentId,
      blockId,
      lessonId,
      topicId,
      subtopicId,
      candidates,
      chunkSize = 50,
    } = params;

    let created = 0;
    let updated = 0;
    let sourceCountIncremented = 0;

    for (let i = 0; i < candidates.length; i += chunkSize) {
      const chunk = candidates.slice(i, i + chunkSize);

      await this.prisma.$transaction(async (tx) => {
        for (const candidate of chunk) {
          const existing = await tx.knowledgePoint.findUnique({
            where: { normalizedKey: candidate.normalizedKey },
          });

          if (!existing) {
            await tx.knowledgePoint.create({
              data: {
                source: 'APPROVED_CONTENT',
                approvedContentId,
                blockId,
                lessonId,
                topicId: topicId ?? null,
                subtopicId: subtopicId ?? null,
                normalizedKey: candidate.normalizedKey,
                fact: candidate.fact,
                priority: candidate.priority,
                examRelevance: candidate.examRelevance,
                classificationConfidence: candidate.classificationConfidence,
                sourceCount: 1,
              },
            });
            created += 1;
            continue;
          }

          await tx.knowledgePoint.update({
            where: { id: existing.id },
            data: {
              approvedContentId,
              blockId,
              lessonId,
              topicId: topicId ?? existing.topicId ?? null,
              subtopicId: subtopicId ?? existing.subtopicId ?? null,
              priority: Math.max(existing.priority, candidate.priority),
              examRelevance: Math.max(
                existing.examRelevance ?? 0,
                candidate.examRelevance,
              ),
              classificationConfidence: Math.max(
                existing.classificationConfidence ?? 0,
                candidate.classificationConfidence,
              ),
              sourceCount: { increment: 1 },
            },
          });

          updated += 1;
          sourceCountIncremented += 1;
        }
      });
    }

    return {
      created,
      updated,
      sourceCountIncremented,
    };
  }
}
