/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { ConceptService } from '../concept/concept.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionConceptResolver {
  constructor(
    private conceptService: ConceptService,
    private prisma: PrismaService,
  ) {}

  async resolveAndLinkConcepts(
    questionId: string,
    conceptHints: string[],
  ): Promise<void> {
    const resolvedConcepts =
      await this.conceptService.resolveConcepts(conceptHints);

    if (resolvedConcepts.length === 0) {
      return;
    }

    for (const concept of resolvedConcepts) {
      await this.prisma.questionConcept.upsert({
        where: {
          questionId_conceptId: {
            questionId,
            conceptId: concept.id,
          },
        },
        update: {},
        create: {
          questionId,
          conceptId: concept.id,
          confidence: 1.0,
        },
      });
    }
  }

  async analyzeQuestionForConcepts(questionId: string): Promise<string[]> {
    const question = await this.prisma.examQuestion.findUnique({
      where: { id: questionId },
      include: {
        concepts: {
          include: {
            concept: {
              include: {
                aliases: {
                  where: { isActive: true },
                },
              },
            },
          },
        },
      },
    });

    if (!question) {
      return [];
    }

    return question.concepts.map((qc) => qc.concept.preferredLabel);
  }
}
