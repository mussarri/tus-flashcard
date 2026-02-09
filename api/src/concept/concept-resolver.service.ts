import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConceptStatus } from '@prisma/client';
import { normalizeConceptKey } from '../common/normalize/normalize-concept-key';

@Injectable()
export class ConceptResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveConcepts(hints: string[]) {
    const normalizedHints = hints.flatMap((h) => {
      const base = normalizeConceptKey(h);
      return [base, base.replace(/-/g, ' ')];
    });

    const concepts = await this.prisma.concept.findMany({
      where: {
        OR: [
          { normalizedLabel: { in: normalizedHints } },
          {
            aliases: {
              some: {
                normalizedAlias: { in: normalizedHints },
                isActive: true,
              },
            },
          },
        ],
        status: { in: [ConceptStatus.ACTIVE, ConceptStatus.NEEDS_REVIEW] },
      },
      include: { mergedInto: true },
    });

    // mergedInto varsa canonical'a dön
    return concepts.map((c) => c.mergedInto ?? c);
  }
}
