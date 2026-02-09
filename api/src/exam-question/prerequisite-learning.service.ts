/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConceptStatus, EdgeStrength } from '@prisma/client';
import { UnresolvedHintsService } from '../admin/unresolved-hints/unresolved-hints.service';
import {
  normalizeConceptKey,
  normalizePrerequisiteLabel,
} from '../common/normalize/normalize-concept-key';
import { ConceptResolverService } from '../concept/concept-resolver.service';

export interface PrerequisiteAnalytics {
  totalPrerequisites: number;
  totalTopics: number;
  totalEdges: number;
  edgesByStrength: {
    STRONG: number;
    MEDIUM: number;
    WEAK: number;
  };
  avgPrerequisitesPerTopic: number;
  topPrerequisites: Array<{
    name: string;
    topicCount: number;
    strongEdgeCount: number;
  }>;
  topicsWithMissingStrongPrerequisites: Array<{
    name: string;
    prerequisiteCount: number;
    strongPrerequisiteCount: number;
  }>;
}

export interface GraphNode {
  id: string;
  name: string;
  type: 'prerequisite' | 'topic';
  strength?: EdgeStrength;
  frequency?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  frequency: number;
  strength: EdgeStrength;
}

interface PrerequisitePayload {
  label?: string;
  conceptHints?: string[];
}

interface ConceptLite {
  id: string;
  preferredLabel: string;
}

@Injectable()
export class PrerequisiteLearningService {
  private readonly logger = new Logger(PrerequisiteLearningService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => UnresolvedHintsService))
    private readonly unresolvedHintsService: UnresolvedHintsService,
    private readonly conceptResolverService: ConceptResolverService,
  ) {}

  private normalizeCanonicalKey(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * ================================
   * PREREQUISITE CLASSIFICATION ENGINE
   * ================================
   *
   * Determines if a prerequisite should be:
   * - ACTIVE: Safe to use in learning paths
   * - NEEDS_REVIEW: Requires admin review before use
   * - DEPRECATED: Should not be used
   *
   * Classification Rules (from spec):
   * 1️⃣ Could not be mapped to existing Concept → NEEDS_REVIEW
   * 2️⃣ Label-only (text exists but concept missing) → NEEDS_REVIEW
   * 3️⃣ Overly generic or ambiguous → NEEDS_REVIEW
   * 4️⃣ Multiple concepts matched but label unclear → NEEDS_REVIEW
   * 5️⃣ Context-dependent meaning → NEEDS_REVIEW
   * 6️⃣ Irrelevant/wrong/outside anatomy → DEPRECATED
   */
  private classifyPrerequisite(
    label: string,
    conceptHints: string[],
    resolvedConcepts: ConceptLite[],
  ): {
    status: 'ACTIVE' | 'NEEDS_REVIEW' | 'DEPRECATED';
    reviewReason: string | null;
  } {
    const normalizedLabel = label.toLowerCase().trim();

    // ================================
    // DEPRECATED RULES
    // ================================

    // Check for non-anatomy content
    const deprecatedKeywords = [
      'treatment',
      'medication',
      'drug',
      'therapy',
      'surgery',
      'diagnosis',
      'clinical',
      'patient',
      'tedavi',
      'ilaç',
      'cerrahi',
      'klinik',
    ];

    if (
      deprecatedKeywords.some((keyword) => normalizedLabel.includes(keyword))
    ) {
      return {
        status: 'DEPRECATED',
        reviewReason: 'Outside anatomy scope (clinical/treatment content)',
      };
    }

    // ================================
    // NEEDS_REVIEW RULES
    // ================================

    // Rule 1: No concept hints provided
    if (!conceptHints || conceptHints.length === 0) {
      return {
        status: 'NEEDS_REVIEW',
        reviewReason: 'No concept hints provided by AI',
      };
    }

    // Rule 2: Could not map to existing concepts
    if (resolvedConcepts.length === 0) {
      return {
        status: 'NEEDS_REVIEW',
        reviewReason: 'Could not map to existing concepts',
      };
    }

    // Rule 3: Overly generic labels
    const genericPatterns = [
      /^(sinir|damar|kas|organ) (seyri|anatomisi|yapısı)$/i,
      /^(genel|temel) (anatomi|bilgi)$/i,
      /^(bölge|alan) (özellikleri)$/i,
    ];

    if (genericPatterns.some((pattern) => pattern.test(normalizedLabel))) {
      return {
        status: 'NEEDS_REVIEW',
        reviewReason: 'Overly generic or ambiguous label',
      };
    }

    // Rule 4: Multiple concepts but label doesn't clearly combine them
    if (resolvedConcepts.length > 1) {
      const conceptLabels = resolvedConcepts
        .map((c) => c.preferredLabel.toLowerCase())
        .join(' ');

      // Check if label meaningfully references all concepts
      const allConceptsReferenced = resolvedConcepts.every((concept) => {
        const conceptWords = concept.preferredLabel.toLowerCase().split(/\s+/);
        return conceptWords.some((word) =>
          normalizedLabel.includes(word.toLowerCase()),
        );
      });

      if (!allConceptsReferenced) {
        return {
          status: 'NEEDS_REVIEW',
          reviewReason: `Multiple concepts (${resolvedConcepts.length}) but label unclear`,
        };
      }
    }

    // Rule 5: Very short labels (likely incomplete)
    if (normalizedLabel.length < 3) {
      return {
        status: 'NEEDS_REVIEW',
        reviewReason: 'Label too short (likely incomplete)',
      };
    }

    // Rule 6: Mismatch between hint count and resolved concept count
    if (conceptHints.length > resolvedConcepts.length + 2) {
      return {
        status: 'NEEDS_REVIEW',
        reviewReason: `Hint mismatch: ${conceptHints.length} hints → ${resolvedConcepts.length} concepts`,
      };
    }

    // ================================
    // DEFAULT: ACTIVE
    // ================================
    return {
      status: 'ACTIVE',
      reviewReason: null,
    };
  }

  // async resolveConcepts(
  //   hints: string[],
  // ): Promise<{ id: string; preferredLabel: string }[]> {
  //   if (!hints || hints.length === 0) {
  //     return [];
  //   }

  //   const normalizedHints = hints.flatMap((h) => {
  //     const base = this.normalizeConceptKey(h);
  //     return [
  //       base,
  //       base.replace(/-/g, ' '), // backward compatibility
  //     ];
  //   });

  //   // 1️⃣ Concept + Alias üzerinden çöz
  //   const concepts = await this.prisma.concept.findMany({
  //     where: {
  //       OR: [
  //         { normalizedLabel: { in: normalizedHints } },
  //         {
  //           aliases: {
  //             some: {
  //               normalizedAlias: { in: normalizedHints },
  //             },
  //           },
  //         },
  //       ],
  //       status: {
  //         in: [ConceptStatus.ACTIVE, ConceptStatus.NEEDS_REVIEW],
  //       },
  //     },
  //     include: {
  //       mergedInto: true,
  //     },
  //   });

  //   if (concepts.length === 0) {
  //     return [];
  //   }

  //   // 2️⃣ MERGED redirect (canonical concept id)
  //   const resolved = concepts.map((c) => {
  //     const target =
  //       c.status === ConceptStatus.MERGED && c.mergedInto ? c.mergedInto : c;

  //     return {
  //       id: target.id,
  //       preferredLabel: target.preferredLabel,
  //     };
  //   });

  //   // 3️⃣ Aynı concept tekrarını temizle
  //   const unique = new Map<string, { id: string; preferredLabel: string }>();
  //   for (const c of resolved) {
  //     unique.set(c.id, c);
  //   }

  //   return Array.from(unique.values());
  // }

  async findOrCreatePrerequisiteByConcept(
    conceptIds: string[],
    displayLabel: string,
    conceptHints: string[] = [],
  ): Promise<{ id: string } | null> {
    if (!conceptIds || conceptIds.length === 0) {
      return null;
    }

    const canonicalKey = this.buildPrerequisiteCanonicalKey(conceptIds);

    // 1️⃣ Aynı concept set için prerequisite var mı?
    const existing = await this.prisma.prerequisite.findUnique({
      where: { canonicalKey },
    });

    if (existing) {
      return { id: existing.id };
    }

    // 2️⃣ Fetch concepts for classification
    const concepts = await this.prisma.concept.findMany({
      where: { id: { in: conceptIds } },
      select: { id: true, preferredLabel: true },
    });

    // 3️⃣ Apply classification rules
    const classification = this.classifyPrerequisite(
      displayLabel,
      conceptHints,
      concepts,
    );

    // 4️⃣ Create with appropriate status
    const prerequisite = await this.prisma.prerequisite.create({
      data: {
        canonicalKey,
        name: normalizePrerequisiteLabel(displayLabel),
        displayName: displayLabel,
        status: classification.status,
        reviewReason: classification.reviewReason,
        concepts: {
          createMany: {
            data: conceptIds.map((conceptId) => ({
              conceptId,
            })),
            skipDuplicates: true,
          },
        },
      },
      include: {
        concepts: true,
      },
    });

    if (classification.status !== 'ACTIVE') {
      this.logger.warn(
        `Prerequisite "${displayLabel}" marked as ${classification.status}: ${classification.reviewReason}`,
      );
    }

    return { id: prerequisite.id };
  }

  async findOrCreatePrerequisiteByLabel(
    rawLabel: string,
  ): Promise<{ id: string } | null> {
    if (!rawLabel || !rawLabel.trim()) {
      return null;
    }

    // 1️⃣ Normalize label (deterministic)
    const normalizedLabel = normalizePrerequisiteLabel(rawLabel);

    // LABEL-ONLY canonical key (explicit & traceable)
    const canonicalKey = `LABEL_ONLY::${normalizedLabel}`;

    return await this.prisma.$transaction(async (tx) => {
      // 2️⃣ Existing?
      const existing = await tx.prerequisite.findUnique({
        where: { canonicalKey },
        select: { id: true },
      });

      if (existing) {
        return { id: existing.id };
      }

      // 3️⃣ Apply classification (label-only always needs review)
      const classification = this.classifyPrerequisite(
        rawLabel,
        [], // No concept hints for label-only
        [], // No resolved concepts
      );

      // 4️⃣ Create new LABEL-ONLY prerequisite
      const prerequisite = await tx.prerequisite.create({
        data: {
          canonicalKey,
          name: normalizedLabel, // system canonical
          displayName: rawLabel.trim(), // original AI label
          status: 'NEEDS_REVIEW', // ⚠️ very important
          reviewReason:
            classification.reviewReason ||
            'Label-only prerequisite (no concepts)',
        },
        select: { id: true },
      });

      this.logger.warn(
        `Created LABEL-ONLY prerequisite "${rawLabel}": ${classification.reviewReason}`,
      );

      return { id: prerequisite.id };
    });
  }

  private buildPrerequisiteCanonicalKey(conceptIds: string[]): string {
    // Order is IMPORTANT for deterministic key
    return conceptIds.sort().join('|');
  }

  /**
   * Process an analyzed exam question and update the prerequisite graph
   */
  async processAnalyzedQuestion(examQuestionId: string): Promise<void> {
    this.logger.log(`Processing analyzed question: ${examQuestionId}`);

    const question = await this.prisma.examQuestion.findUnique({
      where: { id: examQuestionId },
      select: {
        id: true,
        lesson: { select: { id: true, name: true } },
        topic: { select: { id: true } },
        subtopic: { select: { id: true } },
        analysisPayload: true,
        analysisStatus: true,
      },
    });

    if (!question) {
      throw new Error(`Exam question ${examQuestionId} not found`);
    }

    // 🔒 HARD GUARD — sadece FINAL sorular
    if (question.analysisStatus !== 'ANALYZED') {
      this.logger.warn(
        `Question ${examQuestionId} skipped (status: ${question.analysisStatus})`,
      );
      return;
    }

    if (!question.topic) {
      this.logger.warn(`Question ${examQuestionId} has no topic — skipping`);
      return;
    }

    const analysis = question.analysisPayload as any;
    if (!analysis?.prerequisites || !Array.isArray(analysis.prerequisites)) {
      this.logger.warn(
        `Question ${examQuestionId} has no prerequisites in analysis payload`,
      );
      return;
    }

    const prerequisites = analysis.prerequisites as Array<
      PrerequisitePayload | string
    >;

    if (prerequisites.length === 0) return;

    this.logger.log(
      `Processing ${prerequisites.length} prerequisites for question ${examQuestionId}`,
    );

    const processedPrerequisiteIds = new Set<string>();

    for (const prerequisite of prerequisites) {
      const payload: PrerequisitePayload =
        typeof prerequisite === 'string'
          ? { label: prerequisite }
          : prerequisite;

      const hints = payload.conceptHints ?? [];

      // 🔕 Final aşamada hint yoksa skip
      if (hints.length === 0) {
        this.logger.warn(
          `Skipping prerequisite "${payload.label}" — no conceptHints`,
        );
        continue;
      }

      // ✅ SADECE mevcut concept’ler
      const concepts = await this.conceptResolverService.resolveConcepts(hints);

      // ❌ Final aşamada concept yoksa → graph oluşturulmaz
      if (concepts.length === 0) {
        this.logger.warn(
          `No resolved concepts for prerequisite "${payload.label}" (question: ${examQuestionId})`,
        );
        for (const conceptName of hints) {
          await this.unresolvedHintsService.recordUnresolvedHint({
            hint: conceptName,
            questionId: examQuestionId,
            lessonId: question.lesson.id,
            topicId: question.topic?.id || '',
            subtopicId: question.subtopic?.id || '',
          });
        }
        continue;
      }

      // 🔗 Question ↔ Concept bağla
      for (const concept of concepts) {
        await this.prisma.questionConcept.upsert({
          where: {
            questionId_conceptId: {
              questionId: examQuestionId,
              conceptId: concept.id,
            },
          },
          update: {},
          create: {
            questionId: examQuestionId,
            conceptId: concept.id,
            confidence: 1.0,
          },
        });
      }

      const label =
        payload.label ?? concepts.map((c) => c.preferredLabel).join(' + ');

      // 🔑 Canonical prerequisite = concept set
      const canonical = await this.findOrCreatePrerequisiteByConcept(
        concepts.map((c) => c.id),
        label,
        hints, // Pass concept hints for classification
      );

      if (!canonical || processedPrerequisiteIds.has(canonical.id)) {
        continue;
      }

      processedPrerequisiteIds.add(canonical.id);

      // 🔗 GRAPH EDGE — işin kalbi
      await this.addPrerequisiteTopicEdge(
        canonical.id,
        question.topic.id,
        question.lesson.name,
        question.subtopic?.id,
      );
    }

    this.logger.log(
      `Finished processing prerequisites for question ${examQuestionId}`,
    );
  }

  /**
   * Add or update a prerequisite → topic edge
   */
  private async addPrerequisiteTopicEdge(
    prerequisiteId: string,
    topicId: string,
    lesson: string,
    subtopicId?: string,
  ): Promise<void> {
    const lessonId = await this.prisma.lesson.findUnique({
      where: { name: lesson },
      select: { id: true },
    });

    if (!lessonId) {
      throw new Error(`Lesson "${lesson}" not found`);
    }

    const edge = await this.prisma.prerequisiteTopicEdge.upsert({
      where: {
        prerequisiteId_topicId: {
          prerequisiteId: prerequisiteId,
          topicId,
        },
      },
      update: {
        frequency: { increment: 1 },
        lastUpdatedAt: new Date(),
        subtopicId,
      },
      create: {
        prerequisiteId: prerequisiteId,
        topicId,
        subtopicId: subtopicId || null,
        frequency: 1,
        strength: this.calculateEdgeStrength(1), // İlk oluşturma
      },
    });

    const updatedStrength = this.calculateEdgeStrength(edge.frequency);
    await this.prisma.prerequisiteTopicEdge.update({
      where: { id: edge.id },
      data: { strength: updatedStrength },
    });

    this.logger.debug(
      `Updated edge: ${prerequisiteId} → "${topicId}" (strength: ${updatedStrength})`,
    );
  }

  /**
   * Calculate edge strength based on frequency per spec
   */
  private calculateEdgeStrength(frequency: number): EdgeStrength {
    if (frequency >= 10) return 'STRONG';
    if (frequency >= 4) return 'MEDIUM';
    return 'WEAK';
  }

  /**
   * Get prerequisite graph for a specific topic
   */
  async getTopicPrerequisites(
    topicId: string,
    lesson: string = 'Anatomi',
  ): Promise<{
    topic: GraphNode;
    prerequisites: Array<
      GraphNode & { frequency: number; strength: EdgeStrength }
    >;
  }> {
    const lessonId = await this.prisma.lesson.findUnique({
      where: { name: lesson },
      select: { id: true },
    });
    if (!lessonId) {
      throw new Error(`Lesson "${lesson}" not found`);
    }
    const topic = await this.prisma.topic.findUnique({
      where: {
        id: topicId,
      },
      include: {
        prerequisiteEdges: {
          include: {
            prerequisite: true,
          },
        },
      },
    });

    if (!topic) {
      throw new Error(`Topic "${topicId}" in lesson "${lesson}" not found`);
    }

    const prerequisites = topic.prerequisiteEdges.map((edge) => ({
      id: edge.prerequisite.id,
      name: edge.prerequisite.name,
      type: 'prerequisite' as const,
      frequency: edge.frequency,
      strength: edge.strength,
    }));

    return {
      topic: {
        id: topic.id,
        name: topic.name,
        type: 'topic',
      },
      prerequisites,
    };
  }

  /**
   * Get topics that require a specific prerequisite
   */
  async getPrerequisiteTopics(prerequisiteName: string): Promise<{
    prerequisite: GraphNode;
    topics: Array<GraphNode & { frequency: number; strength: EdgeStrength }>;
  }> {
    const prerequisite = await this.prisma.prerequisite.findUnique({
      where: { canonicalKey: this.normalizeCanonicalKey(prerequisiteName) },
      include: {
        edges: {
          include: {
            topic: true,
          },
        },
        concepts: {
          include: {
            concept: true,
          },
        },
      },
    });

    if (!prerequisite) {
      throw new Error(`Prerequisite "${prerequisiteName}" not found`);
    }

    const topics = prerequisite.edges.map((edge) => ({
      id: edge.topic.id,
      name: edge.topic.name,
      type: 'topic' as const,
      frequency: edge.frequency,
      strength: edge.strength,
    }));

    return {
      prerequisite: {
        id: prerequisite.id,
        name: prerequisite.name,
        type: 'prerequisite',
      },
      topics,
    };
  }

  /**
   * Get all prerequisite nodes with their edges (with pagination and sorting)
   */
  async getAllPrerequisites(query?: {
    search?: string;
    strengthFilter?: 'ALL' | 'STRONG' | 'MEDIUM' | 'WEAK';
    statusFilter?: 'ALL' | 'ACTIVE' | 'NEEDS_REVIEW' | 'DEPRECATED';
    minFrequency?: number;
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'edges' | 'concepts' | 'date';
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      search = '',
      strengthFilter = 'ALL',
      statusFilter = 'ALL',
      minFrequency = 0,
      page = 1,
      limit = 10,
      sortBy = 'name',
      sortOrder = 'asc',
    } = query || {};

    // Build where clause for filtering
    const where: any = {};

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      where.status = statusFilter;
    }

    // For strength and frequency filtering, we need to filter after fetching
    // because Prisma doesn't support filtering on nested relations easily

    // Build orderBy clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'name':
        orderBy = { name: sortOrder };
        break;
      case 'date':
        orderBy = { createdAt: sortOrder };
        break;
      case 'edges':
        // Will sort in memory after fetching
        orderBy = { name: 'asc' };
        break;
      case 'concepts':
        // Will sort in memory after fetching
        orderBy = { name: 'asc' };
        break;
      default:
        orderBy = { name: sortOrder };
    }

    // Fetch all matching prerequisites (we'll do complex filtering in memory)
    const allPrerequisites = await this.prisma.prerequisite.findMany({
      where,
      include: {
        edges: {
          include: {
            topic: true,
            subtopic: true,
          },
        },
        concepts: {
          include: {
            concept: true,
          },
        },
      },
      orderBy,
    });

    // Transform to response format
    let prerequisites = allPrerequisites.map((prereq) => ({
      id: prereq.id,
      name: prereq.name,
      createdAt: prereq.createdAt,
      status: prereq.status,
      reviewReason: prereq.reviewReason,
      edges: (prereq.edges || []).map((edge) => ({
        topic: edge.topic.name,
        subtopic: edge.subtopic?.name,
        frequency: edge.frequency,
        strength: edge.strength,
      })),
      concepts: (prereq.concepts || []).map((link) => ({
        id: link.concept.id,
        preferredLabel: link.concept.preferredLabel,
      })),
    }));

    // Apply strength and frequency filters
    prerequisites =
      statusFilter == 'NEEDS_REVIEW' || statusFilter == 'DEPRECATED'
        ? prerequisites
        : prerequisites.filter((prereq) => {
            const matchesStrength =
              strengthFilter === 'ALL' ||
              prereq.edges.some((edge) => edge.strength === strengthFilter);
            const matchesFrequency = prereq.edges.some(
              (edge) => edge.frequency >= minFrequency,
            );
            return matchesStrength && matchesFrequency;
          });

    // Apply sorting for edge count and concept count
    if (sortBy === 'edges') {
      prerequisites.sort((a, b) => {
        const comparison = a.edges.length - b.edges.length;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    } else if (sortBy === 'concepts') {
      prerequisites.sort((a, b) => {
        const comparison = a.concepts.length - b.concepts.length;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    // Calculate pagination
    const total = prerequisites.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const paginatedPrerequisites = prerequisites.slice(skip, skip + limit);

    return {
      prerequisites: paginatedPrerequisites,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get comprehensive prerequisite detail for admin inspection
   * READ-ONLY: No modifications, just inspection data
   */
  async getPrerequisiteDetail(
    id: string,
    query: {
      lesson?: string;
      includeEvidence?: boolean;
      evidenceLimit?: number;
      evidenceOffset?: number;
    },
  ) {
    const {
      lesson = 'Anatomi',
      includeEvidence = false,
      evidenceLimit = 10,
      evidenceOffset = 0,
    } = query;

    const lessonId = await this.prisma.lesson.findUnique({
      where: { name: lesson },
      select: { id: true },
    });

    // 1️⃣ Fetch prerequisite with all relations
    const prerequisite = await this.prisma.prerequisite.findUnique({
      where: { id },
      include: {
        concepts: {
          include: {
            concept: {
              select: {
                id: true,
                preferredLabel: true,
                conceptType: true,
                status: true,
              },
            },
          },
        },
        edges: {
          include: {
            topic: {
              select: {
                name: true,
                id: true,
              },
            },
            subtopic: {
              select: {
                name: true,
                id: true,
              },
            },
          },
          orderBy: {
            frequency: 'desc',
          },
        },
      },
    });

    if (!prerequisite) {
      throw new Error(`Prerequisite with ID ${id} not found`);
    }

    // 2️⃣ Concept Binding
    const linkedConcepts = prerequisite.concepts.map((link) => ({
      conceptId: link.concept.id,
      preferredLabel: link.concept.preferredLabel,
      conceptType: link.concept.conceptType,
      status: link.concept.status,
    }));

    const isConceptLess = linkedConcepts.length === 0;

    // 3️⃣ Topic & Subtopic Coverage
    const topicCoverage = prerequisite.edges.map((edge) => ({
      topicName: edge.topic.name,
      subtopic: edge.subtopic?.name || null,
      frequency: edge.frequency,
      strength: edge.strength,
    }));

    const totalFrequency = prerequisite.edges.reduce(
      (sum, edge) => sum + edge.frequency,
      0,
    );

    const maxStrength = this.getMaxStrength(
      prerequisite.edges.map((e) => e.strength),
    );

    // 4️⃣ Exam Impact Metrics
    // Get total analyzed questions for the lesson
    const totalQuestionsForLesson = await this.prisma.examQuestion.count({
      where: {
        lesson: {
          name: lesson,
        },
        analysisStatus: 'ANALYZED',
      },
    });

    const examImportance =
      totalQuestionsForLesson > 0
        ? (totalFrequency / totalQuestionsForLesson) * 100
        : 0;

    // Optional: Calculate rank among all prerequisites in same lesson
    // Get all topics for this lesson first
    const topicsInLesson = await this.prisma.topic.findMany({
      where: { lessonId: lessonId?.id || undefined },
      select: { id: true },
    });

    const topicIdsInLesson = topicsInLesson.map((t) => t.id);

    // Get all prerequisites linked to these topics
    const allPrerequisitesWithFrequency =
      await this.prisma.prerequisite.findMany({
        where: {
          edges: {
            some: {
              topicId: {
                in: topicIdsInLesson,
              },
            },
          },
        },
        include: {
          edges: {
            where: {
              topicId: {
                in: topicIdsInLesson,
              },
            },
          },
        },
      });

    const prerequisitesWithTotalFreq = allPrerequisitesWithFrequency.map(
      (p) => ({
        id: p.id,
        totalFreq: p.edges.reduce((sum, e) => sum + e.frequency, 0),
      }),
    );

    prerequisitesWithTotalFreq.sort((a, b) => b.totalFreq - a.totalFreq);

    const rank = prerequisitesWithTotalFreq.findIndex((p) => p.id === id) + 1;

    const examMetrics = {
      examImportance: parseFloat(examImportance.toFixed(2)),
      totalFrequency,
      maxStrength,
      rank,
    };

    // 5️⃣ Pattern Context
    // Since prerequisites are not directly linked to ExamQuestions in schema,
    // we need to infer from topics that have this prerequisite
    const topicsWithThisPrerequisite = prerequisite.edges.map(
      (edge) => edge.topic.id,
    );

    const questionsWithPrerequisite = await this.prisma.examQuestion.findMany({
      where: {
        lesson: {
          name: lesson,
        },
        topic: {
          id: { in: topicsWithThisPrerequisite },
        },
        analysisStatus: 'ANALYZED',
      },
      select: {
        id: true,
        patternType: true,
      },
    });

    // Group by pattern type
    const patternMap = new Map<string, number>();

    for (const question of questionsWithPrerequisite) {
      const patternType = question.patternType || 'UNKNOWN';
      patternMap.set(patternType, (patternMap.get(patternType) || 0) + 1);
    }

    const patternContext = Array.from(patternMap.entries())
      .map(([patternType, count]) => ({
        patternType,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // 6️⃣ Source Evidence (Optional / Paginated)
    let sourceEvidence:
      | {
          questions: Array<{
            questionId: string;
            year: number;
            topic: string | null;
            subtopic: string | null;
            patternType: string | null;
          }>;
          total: number;
        }
      | undefined = undefined;

    //questions that have this prerequisite via their topics
    const questions = await this.prisma.examQuestion.findMany({
      where: {
        lesson: {
          name: lesson,
        },
        topic: {
          id: { in: topicsWithThisPrerequisite },
        },
        analysisStatus: 'ANALYZED',
      },
      select: {
        id: true,
        year: true,
        topic: {
          select: {
            name: true,
          },
        },
        subtopic: {
          select: {
            name: true,
          },
        },
        patternType: true,
        question: true,
        options: true,
        correctAnswer: true,
      },
      orderBy: {
        year: 'desc',
      },
      skip: evidenceOffset,
      take: evidenceLimit,
    });

    const totalEvidence = await this.prisma.examQuestion.count({
      where: {
        lesson: {
          name: lesson,
        },
        topic: {
          id: { in: topicsWithThisPrerequisite },
        },
        analysisStatus: 'ANALYZED',
      },
    });

    sourceEvidence = {
      questions: questions.map((q) => ({
        questionId: q.id,
        year: q.year,
        topic: q.topic?.name ?? null,
        subtopic: q.subtopic?.name ?? null,
        patternType: q.patternType,
      })),
      total: totalEvidence,
    };

    // 7️⃣ Merge Candidates
    const mergeCandidates = await this.findMergeCandidates(id, lesson);
    console.log(questions);

    // Assemble final response
    return {
      // 1. Core
      id: prerequisite.id,
      name: prerequisite.name,
      canonicalKey: prerequisite.canonicalKey,
      createdAt: prerequisite.createdAt,
      updatedAt: prerequisite.updatedAt,

      // 2. Concept Binding
      linkedConcepts,
      isConceptLess,

      // 3. Topic Coverage
      topicCoverage,
      totalFrequency,
      maxStrength,

      // 4. Exam Impact
      examMetrics,

      // 5. Pattern Context
      patternContext,

      // 6. Source Evidence
      sourceEvidence,
      questions,
      // 7. Merge Candidates
      mergeCandidates,
    };
  }

  /**
   * Find merge candidates based on similarity scoring
   * Factors: shared concepts, overlapping topics, name similarity, co-occurrence
   */
  private async findMergeCandidates(
    prerequisiteId: string,
    lesson: string,
  ): Promise<
    Array<{
      prerequisiteId: string;
      name: string;
      similarityScore: number;
      reasons: string[];
    }>
  > {
    const lessonId = await this.prisma.lesson.findUnique({
      where: { name: lesson },
      select: { id: true },
    });
    // Get current prerequisite with relations
    const current = await this.prisma.prerequisite.findUnique({
      where: { id: prerequisiteId },
      include: {
        concepts: true,
        edges: {
          where: {
            topic: {
              lessonId: lessonId?.id || undefined,
            },
          },
          include: {
            topic: true,
          },
        },
      },
    });

    if (!current) {
      return [];
    }

    // Get all other prerequisites in the same lesson
    const otherPrerequisites = await this.prisma.prerequisite.findMany({
      where: {
        id: { not: prerequisiteId },
        edges: {
          some: {
            topic: {
              lessonId: lessonId?.id || undefined,
            },
          },
        },
      },
      include: {
        concepts: true,
        edges: {
          where: {
            topic: {
              lessonId: lessonId?.id || undefined,
            },
          },
          include: {
            topic: true,
          },
        },
      },
    });

    const currentConceptIds = new Set(current.concepts.map((c) => c.conceptId));
    const currentTopicNames = new Set(current.edges.map((e) => e.topic.name));

    const candidates = otherPrerequisites
      .map((other) => {
        const reasons: string[] = [];
        let score = 0;

        // 1. Shared concepts (strongest signal)
        const otherConceptIds = new Set(other.concepts.map((c) => c.conceptId));
        const sharedConcepts = [...currentConceptIds].filter((id) =>
          otherConceptIds.has(id),
        );

        if (sharedConcepts.length > 0) {
          score += sharedConcepts.length * 30;
          reasons.push(
            `${sharedConcepts.length} shared concept${sharedConcepts.length > 1 ? 's' : ''}`,
          );
        }

        // 2. Overlapping topics
        const otherTopicNames = new Set(other.edges.map((e) => e.topic.name));
        const sharedTopics = [...currentTopicNames].filter((name) =>
          otherTopicNames.has(name),
        );

        if (sharedTopics.length > 0) {
          score += sharedTopics.length * 10;
          reasons.push(
            `${sharedTopics.length} shared topic${sharedTopics.length > 1 ? 's' : ''}`,
          );
        }

        // 3. Name similarity (Levenshtein distance)
        const nameSimilarity = this.calculateStringSimilarity(
          current.name,
          other.name,
        );

        if (nameSimilarity > 0.7) {
          score += Math.floor(nameSimilarity * 20);
          reasons.push(
            `High name similarity (${Math.floor(nameSimilarity * 100)}%)`,
          );
        }

        // 4. Co-occurrence in same questions
        // This is expensive, so we skip for now but could be added

        return {
          prerequisiteId: other.id,
          name: other.name,
          similarityScore: score,
          reasons,
        };
      })
      .filter((c) => c.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 10); // Top 10 candidates

    return candidates;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(
      longer.toLowerCase(),
      shorter.toLowerCase(),
    );
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Helper: Get maximum strength from array
   */
  private getMaxStrength(strengths: EdgeStrength[]): EdgeStrength {
    if (strengths.includes('STRONG')) return 'STRONG';
    if (strengths.includes('MEDIUM')) return 'MEDIUM';
    return 'WEAK';
  }

  /**
   * ================================
   * ADMIN REVIEW ASSISTANT
   * ================================
   *
   * Provides concise recommendations for reviewing NEEDS_REVIEW prerequisites
   * Returns: Decision (LINK | RENAME | MERGE | IGNORE) + Reason (max 15 words)
   */
  async getReviewRecommendation(prerequisiteId: string): Promise<{
    decision: 'LINK' | 'RENAME' | 'MERGE' | 'IGNORE';
    reason: string;
  }> {
    const prerequisite = await this.prisma.prerequisite.findUnique({
      where: { id: prerequisiteId },
      include: {
        concepts: {
          include: {
            concept: true,
          },
        },
        edges: {
          include: {
            topic: true,
          },
        },
      },
    });

    if (!prerequisite) {
      throw new Error('Prerequisite not found');
    }

    const hasNoConcepts = prerequisite.concepts.length === 0;
    const totalFrequency = prerequisite.edges.reduce(
      (sum, edge) => sum + edge.frequency,
      0,
    );
    const reviewReason = prerequisite.reviewReason?.toLowerCase() || '';

    // Decision logic based on review reason and data

    // 1. LINK - Missing or incomplete concepts
    if (hasNoConcepts) {
      return {
        decision: 'LINK',
        reason: 'No concepts linked. Map to existing anatomy concepts.',
      };
    }

    if (reviewReason.includes('could not map')) {
      return {
        decision: 'LINK',
        reason: 'Concept mapping incomplete. Link to anatomy terms.',
      };
    }

    if (reviewReason.includes('hint mismatch')) {
      return {
        decision: 'LINK',
        reason: 'AI hints not fully resolved. Review concept links.',
      };
    }

    // 2. RENAME - Unclear wording but valid meaning
    if (
      reviewReason.includes('label unclear') ||
      reviewReason.includes('multiple concepts')
    ) {
      return {
        decision: 'RENAME',
        reason: 'Label unclear. Reword to reflect linked concepts.',
      };
    }

    if (reviewReason.includes('too short')) {
      return {
        decision: 'RENAME',
        reason: 'Label incomplete. Expand to clear description.',
      };
    }

    // 3. MERGE - Check for duplicates
    if (totalFrequency < 5 && prerequisite.concepts.length > 0) {
      // Low frequency + has concepts = potential duplicate
      return {
        decision: 'MERGE',
        reason: 'Low usage. Check for similar prerequisites to merge.',
      };
    }

    // 4. IGNORE - Generic or no value
    if (
      reviewReason.includes('generic') ||
      reviewReason.includes('ambiguous')
    ) {
      return {
        decision: 'IGNORE',
        reason: 'Too generic for exam prerequisite tracking.',
      };
    }

    if (totalFrequency < 2) {
      return {
        decision: 'IGNORE',
        reason: 'Very low exam frequency. Likely not useful.',
      };
    }

    // Default: LINK (safest action)
    return {
      decision: 'LINK',
      reason: 'Review concept mapping for accuracy.',
    };
  }

  /**
   * Deprecate a prerequisite (set status to DEPRECATED)
   */
  async deprecatePrerequisite(prerequisiteId: string): Promise<void> {
    await this.prisma.prerequisite.update({
      where: { id: prerequisiteId },
      data: {
        status: 'DEPRECATED',
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Prerequisite ${prerequisiteId} marked as DEPRECATED`);
  }

  /**
   * Link concepts to a prerequisite
   * Replaces existing concept links with the provided ones
   */
  async linkConceptsToPrerequisite(
    prerequisiteId: string,
    conceptIds: string[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Delete existing concept links
      await tx.prerequisiteConcept.deleteMany({
        where: { prerequisiteId },
      });

      // 2. Create new concept links
      if (conceptIds.length > 0) {
        await tx.prerequisiteConcept.createMany({
          data: conceptIds.map((conceptId) => ({
            prerequisiteId,
            conceptId,
          })),
          skipDuplicates: true,
        });
      }

      // 3. Update prerequisite status and canonical key
      const concepts = await tx.concept.findMany({
        where: { id: { in: conceptIds } },
        select: { id: true, preferredLabel: true },
      });

      const newCanonicalKey =
        conceptIds.length > 0
          ? this.buildPrerequisiteCanonicalKey(concepts.map((c) => c.id))
          : `LABEL_ONLY::${prerequisiteId}`;

      const newStatus = conceptIds.length > 0 ? 'ACTIVE' : 'NEEDS_REVIEW';

      await tx.prerequisite.update({
        where: { id: prerequisiteId },
        data: {
          canonicalKey: newCanonicalKey,
          status: newStatus,
          reviewReason:
            conceptIds.length === 0
              ? 'No concepts linked'
              : 'associated concepts updated',
          updatedAt: new Date(),
        },
      });
    });

    this.logger.log(
      `Linked ${conceptIds.length} concepts to prerequisite ${prerequisiteId}`,
    );
  }

  /**
   * Get all topics with their prerequisite edges
   */
  async getAllTopics() {
    const topics = await this.prisma.topic.findMany({
      include: {
        prerequisiteEdges: {
          include: {
            prerequisite: true,
          },
        },
        lesson: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return topics.map((topic) => ({
      id: topic.id,
      name: topic.name,
      lesson: topic.lesson?.name || null,
      createdAt: topic.createdAt,
      edges: topic.prerequisiteEdges.map((edge) => ({
        prerequisite: {
          name: edge.prerequisite.name,
        },
        frequency: edge.frequency,
        strength: edge.strength,
      })),
    }));
  }

  /**
   * Get all subtopics with their prerequisite edges
   */
  async getAllSubtopics() {
    const subtopics = await this.prisma.subtopic.findMany({
      include: {
        topic: true,
        lesson: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const subtopicPrereqMap: Record<
      string,
      Array<{
        prerequisite: string;
        frequency: number;
        strength: EdgeStrength;
      }>
    > = {};

    const edges = await this.prisma.prerequisiteTopicEdge.findMany({
      where: {
        subtopicId: { not: null },
      },
      include: {
        prerequisite: true,
        topic: true,
        subtopic: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    for (const edge of edges) {
      if (!edge.subtopic) continue;
      if (!subtopicPrereqMap[edge.subtopic.name]) {
        subtopicPrereqMap[edge.subtopic.name] = [];
      }
      subtopicPrereqMap[edge.subtopic.name].push({
        prerequisite: edge.prerequisite.name,
        frequency: edge.frequency,
        strength: edge.strength,
      });
    }

    for (const subtopic of subtopics) {
      (subtopic as any).prerequisites = subtopicPrereqMap[subtopic.name] || [];
    }

    return subtopics.map((subtopic) => ({
      id: subtopic.id,
      name: subtopic.name,
      topicName: subtopic.topic.name,
      lesson: subtopic.lesson?.name || null,
      createdAt: subtopic.createdAt,
      prerequisites: (subtopic as any).prerequisites || [],
    }));
  }

  /**
   * Get comprehensive analytics for the prerequisite graph
   */
  async getAnalytics(): Promise<PrerequisiteAnalytics> {
    const [
      totalPrerequisites,
      totalTopics,
      totalEdges,
      edgesByStrength,
      topicPrerequisiteStats,
    ] = await Promise.all([
      this.prisma.prerequisite.count(),
      this.prisma.topic.count(),
      this.prisma.prerequisiteTopicEdge.count(),
      this.prisma.prerequisiteTopicEdge.groupBy({
        by: ['strength'],
        _count: { strength: true },
      }),
      this.prisma.topic.findMany({
        include: {
          _count: {
            select: { prerequisiteEdges: true },
          },
          prerequisiteEdges: {
            where: { strength: 'STRONG' },
            select: { id: true },
          },
        },
      }),
    ]);

    // Process edges by strength
    const strengthCounts = {
      STRONG: 0,
      MEDIUM: 0,
      WEAK: 0,
    };

    edgesByStrength.forEach((group) => {
      strengthCounts[group.strength] = group._count.strength;
    });

    // Calculate average prerequisites per topic
    const avgPrerequisitesPerTopic =
      totalTopics > 0
        ? topicPrerequisiteStats.reduce(
            (sum, topic) => sum + topic._count.prerequisiteEdges,
            0,
          ) / totalTopics
        : 0;

    // Get top prerequisites by topic coverage
    const topPrerequisites = await this.prisma.prerequisite.findMany({
      include: {
        edges: {
          include: { topic: true },
          where: { strength: 'STRONG' },
        },
        _count: {
          select: { edges: true },
        },
      },
      orderBy: {
        edges: {
          _count: 'desc',
        },
      },
      take: 10,
    });

    const topPrerequisitesFormatted = topPrerequisites.map((prereq) => ({
      name: prereq.name,
      topicCount: prereq._count.edges,
      strongEdgeCount: prereq.edges.length,
    }));

    // Find topics with missing strong prerequisites
    const topicsWithMissingStrongPrerequisites = topicPrerequisiteStats
      .filter((topic) => topic.prerequisiteEdges.length === 0) // No strong prerequisites
      .map((topic) => ({
        name: topic.name,
        prerequisiteCount: topic._count.prerequisiteEdges,
        strongPrerequisiteCount: topic.prerequisiteEdges.length,
      }))
      .sort((a, b) => b.prerequisiteCount - a.prerequisiteCount); // Sort by total prerequisites

    return {
      totalPrerequisites,
      totalTopics,
      totalEdges,
      edgesByStrength: strengthCounts,
      avgPrerequisitesPerTopic,
      topPrerequisites: topPrerequisitesFormatted,
      topicsWithMissingStrongPrerequisites,
    };
  }

  /**
   * Get prerequisite context for AI question analysis
   * Returns top STRONG prerequisites for a topic to inject into prompts
   */
  async getPrerequisiteContextForTopic(topicName: string): Promise<string[]> {
    const edges = await this.prisma.prerequisiteTopicEdge.findMany({
      where: {
        topic: {
          name: topicName,
          lesson: {
            name: 'Anatomi',
          },
        },
        strength: 'STRONG',
      },
      include: {
        prerequisite: {
          include: {
            concepts: {
              include: {
                concept: true,
              },
            },
          },
        },
      },
      orderBy: {
        frequency: 'desc',
      },
      take: 10,
    });

    const concepts = new Map<string, string>();
    for (const edge of edges) {
      for (const link of edge.prerequisite.concepts) {
        concepts.set(link.concept.id, link.concept.preferredLabel);
      }
      if (edge.prerequisite.concepts.length === 0) {
        concepts.set(edge.prerequisite.id, edge.prerequisite.name);
      }
    }

    return Array.from(concepts.values()).slice(0, 3);
  }

  /**
   * Check if a topic has sufficient strong prerequisites for advanced content generation
   */
  async shouldBlockAdvancedContentGeneration(
    topicId: string,
  ): Promise<boolean> {
    const topicData = await this.getTopicPrerequisites(topicId);

    const strongPrerequisites = topicData.prerequisites.filter(
      (prereq) => prereq.strength === 'STRONG',
    );

    // Block if topic has no strong prerequisites (per spec: "If STRONG prerequisite is missing: Block advanced flashcard generation")
    return strongPrerequisites.length === 0;
  }

  /**
   * Get learning path recommendations for a topic
   * Returns prerequisite topics that should be learned first
   */
  async getLearningPathForTopic(topicName: string): Promise<string[]> {
    const topicData = await this.getTopicPrerequisites(topicName);

    // Get prerequisite topics ordered by strength and frequency
    const prerequisiteTopics = topicData.prerequisites
      .sort((a, b) => {
        // Sort by strength first (STRONG > MEDIUM > WEAK), then by frequency
        const strengthOrder = { STRONG: 3, MEDIUM: 2, WEAK: 1 };
        const strengthDiff =
          strengthOrder[b.strength] - strengthOrder[a.strength];
        if (strengthDiff !== 0) return strengthDiff;
        return b.frequency - a.frequency;
      })
      .slice(0, 5) // Top 5 prerequisites
      .map((prereq) => prereq.name);

    return prerequisiteTopics;
  }

  /**
   * Bulk process all analyzed anatomy questions
   * Useful for initial graph building or reprocessing
   */
  async processAllAnalyzedQuestions(): Promise<{
    processed: number;
    skipped: number;
    errors: number;
  }> {
    //await this.backfillPrerequisiteConcepts();

    const analyzedQuestions = await this.prisma.examQuestion.findMany({
      where: {
        analysisStatus: 'ANALYZED',
        topicId: {
          not: undefined,
        },
      },
      select: { id: true },
    });

    let processed = 0;
    const skipped = 0;
    let errors = 0;

    this.logger.log(
      `Processing ${analyzedQuestions.length} analyzed anatomy questions`,
    );

    for (const question of analyzedQuestions) {
      try {
        await this.processAnalyzedQuestion(question.id);
        processed++;
      } catch (error) {
        this.logger.error(`Failed to process question ${question.id}:`, error);
        errors++;
      }
    }

    this.logger.log(
      `Bulk processing complete: ${processed} processed, ${skipped} skipped, ${errors} errors`,
    );

    return { processed, skipped, errors };
  }

  /**
   * Preview merge of selected prerequisites
   * Shows what will be affected before actual merge
   */
  async previewPrerequisiteMerge(selectedPrerequisiteIds: string[]) {
    if (selectedPrerequisiteIds.length < 2) {
      throw new Error('At least 2 prerequisites must be selected for merge');
    }

    const prerequisites = await this.prisma.prerequisite.findMany({
      where: { id: { in: selectedPrerequisiteIds } },
      include: {
        concepts: {
          include: {
            concept: {
              select: {
                id: true,
                preferredLabel: true,
              },
            },
          },
        },
        edges: {
          include: {
            topic: {
              select: {
                id: true,
                name: true,
                lesson: {
                  select: {
                    name: true,
                    displayName: true,
                  },
                },
              },
            },
            subtopic: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (prerequisites.length !== selectedPrerequisiteIds.length) {
      throw new Error('One or more selected prerequisites not found');
    }

    // -------------------------------
    // SHARED CONCEPTS
    // -------------------------------
    const conceptMap = new Map<
      string,
      { id: string; label: string; count: number }
    >();

    prerequisites.forEach((prereq) => {
      prereq.concepts.forEach((pc) => {
        const key = pc.concept.id;
        const existing = conceptMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          conceptMap.set(key, {
            id: pc.concept.id,
            label: pc.concept.preferredLabel,
            count: 1,
          });
        }
      });
    });

    // -------------------------------
    // TOPIC EDGE AGGREGATION
    // -------------------------------
    const topicEdgeMap = new Map<
      string,
      {
        topicId: string;
        topicName: string;
        lesson: string;
        totalFrequency: number;
        subtopics: Set<string>;
        newStrength: EdgeStrength;
      }
    >();

    prerequisites.forEach((prereq) => {
      prereq.edges.forEach((edge) => {
        const key = edge.topic.id; // ✅ FIX

        const existing = topicEdgeMap.get(key);
        if (existing) {
          existing.totalFrequency += edge.frequency;
          if (edge.subtopic) {
            existing.subtopics.add(edge.subtopic.name);
          }
        } else {
          topicEdgeMap.set(key, {
            topicId: edge.topic.id,
            topicName: edge.topic.name,
            lesson:
              edge.topic.lesson?.displayName ?? edge.topic.lesson?.name ?? '',
            totalFrequency: edge.frequency,
            subtopics: edge.subtopic
              ? new Set([edge.subtopic.name])
              : new Set(),
            newStrength: 'WEAK', // placeholder
          });
        }
      });
    });

    // Recalculate strengths
    topicEdgeMap.forEach((value) => {
      value.newStrength = this.calculateStrength(value.totalFrequency);
    });

    return {
      selectedPrerequisites: prerequisites.map((p) => ({
        id: p.id,
        name: p.name,
        canonicalKey: p.canonicalKey,
        conceptCount: p.concepts.length,
        topicEdgeCount: p.edges.length,
      })),
      sharedConcepts: Array.from(conceptMap.values()),
      topicEdges: Array.from(topicEdgeMap.values()).map((edge) => ({
        topicId: edge.topicId,
        topicName: edge.topicName,
        lesson: edge.lesson,
        totalFrequency: edge.totalFrequency,
        newStrength: edge.newStrength,
        subtopics: Array.from(edge.subtopics),
      })),
      summary: {
        prerequisiteCount: prerequisites.length,
        totalConcepts: conceptMap.size,
        sharedConceptCount: Array.from(conceptMap.values()).filter(
          (c) => c.count > 1,
        ).length,
        affectedTopics: topicEdgeMap.size,
        strengthUpgrades: Array.from(topicEdgeMap.values()).filter(
          (edge) =>
            edge.newStrength === 'STRONG' || edge.newStrength === 'MEDIUM',
        ).length,
      },
    };
  }

  /**
   * Execute prerequisite merge
   * Creates or selects canonical prerequisite and rewires all relations
   */
  async mergePrerequisites(
    selectedPrerequisiteIds: string[],
    canonicalName?: string,
    canonicalPrerequisiteId?: string,
  ) {
    if (selectedPrerequisiteIds.length < 2) {
      throw new Error('At least 2 prerequisites must be selected for merge');
    }

    if (!canonicalName && !canonicalPrerequisiteId) {
      throw new Error(
        'Either canonicalName or canonicalPrerequisiteId must be provided',
      );
    }

    if (canonicalName && canonicalPrerequisiteId) {
      throw new Error(
        'Provide either canonicalName OR canonicalPrerequisiteId, not both',
      );
    }

    if (
      canonicalPrerequisiteId &&
      !selectedPrerequisiteIds.includes(canonicalPrerequisiteId)
    ) {
      throw new Error(
        'Canonical prerequisite must be one of the selected prerequisites',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      let canonicalPrerequisite;

      // -------------------------------
      // 1️⃣ DETERMINE CANONICAL
      // -------------------------------
      if (canonicalPrerequisiteId) {
        canonicalPrerequisite = await tx.prerequisite.findUnique({
          where: { id: canonicalPrerequisiteId },
        });
        if (!canonicalPrerequisite) {
          throw new Error('Canonical prerequisite not found');
        }
      } else {
        const canonicalKey = this.normalizeCanonicalKey(canonicalName!);

        canonicalPrerequisite =
          (await tx.prerequisite.findUnique({
            where: { canonicalKey },
          })) ??
          (await tx.prerequisite.create({
            data: {
              name: canonicalName!,
              canonicalKey,
            },
          }));
      }

      const sourceIds = selectedPrerequisiteIds.filter(
        (id) => id !== canonicalPrerequisite.id,
      );

      if (sourceIds.length === 0) {
        return {
          canonicalPrerequisite,
          mergedCount: 0,
          conceptsMerged: 0,
          topicEdgesUpdated: 0,
        };
      }

      // -------------------------------
      // 2️⃣ FETCH SOURCES
      // -------------------------------
      const sourcePrerequisites = await tx.prerequisite.findMany({
        where: { id: { in: sourceIds } },
        include: {
          concepts: true,
          edges: true,
        },
      });

      // -------------------------------
      // 3️⃣ MERGE CONCEPT LINKS
      // -------------------------------
      const existingConceptLinks = await tx.prerequisiteConcept.findMany({
        where: { prerequisiteId: canonicalPrerequisite.id },
        select: { conceptId: true },
      });

      const existingConceptIds = new Set(
        existingConceptLinks.map((pc) => pc.conceptId),
      );

      const conceptsToMerge = new Set<string>();

      sourcePrerequisites.forEach((prereq) => {
        prereq.concepts.forEach((pc) => {
          if (!existingConceptIds.has(pc.conceptId)) {
            conceptsToMerge.add(pc.conceptId);
          }
        });
      });

      if (conceptsToMerge.size > 0) {
        await tx.prerequisiteConcept.createMany({
          data: Array.from(conceptsToMerge).map((conceptId) => ({
            prerequisiteId: canonicalPrerequisite.id,
            conceptId,
          })),
          skipDuplicates: true,
        });
      }

      // -------------------------------
      // 4️⃣ MERGE TOPIC EDGES
      // -------------------------------
      const existingTopicEdges = await tx.prerequisiteTopicEdge.findMany({
        where: { prerequisiteId: canonicalPrerequisite.id },
      });

      const topicEdgeMap = new Map<
        string,
        { frequency: number; subtopicId?: string }
      >();

      existingTopicEdges.forEach((edge) => {
        topicEdgeMap.set(edge.topicId, {
          frequency: edge.frequency,
          subtopicId: edge.subtopicId ?? undefined,
        });
      });

      sourcePrerequisites.forEach((prereq) => {
        prereq.edges.forEach((edge) => {
          const existing = topicEdgeMap.get(edge.topicId);
          if (existing) {
            existing.frequency += edge.frequency;
          } else {
            topicEdgeMap.set(edge.topicId, {
              frequency: edge.frequency,
              subtopicId: edge.subtopicId ?? undefined,
            });
          }
        });
      });

      for (const [topicId, data] of topicEdgeMap.entries()) {
        const strength = this.calculateStrength(data.frequency);

        await tx.prerequisiteTopicEdge.upsert({
          where: {
            prerequisiteId_topicId: {
              prerequisiteId: canonicalPrerequisite.id,
              topicId,
            },
          },
          create: {
            prerequisiteId: canonicalPrerequisite.id,
            topicId,
            frequency: data.frequency,
            strength,
            subtopicId: data.subtopicId,
          },
          update: {
            frequency: data.frequency,
            strength,
            lastUpdatedAt: new Date(),
          },
        });
      }

      // -------------------------------
      // 5️⃣ DELETE SOURCES
      // -------------------------------
      await tx.prerequisite.deleteMany({
        where: { id: { in: sourceIds } },
      });

      return {
        canonicalPrerequisite: {
          id: canonicalPrerequisite.id,
          name: canonicalPrerequisite.name,
          canonicalKey: canonicalPrerequisite.canonicalKey,
        },
        mergedCount: sourceIds.length,
        conceptsMerged: conceptsToMerge.size,
        topicEdgesUpdated: topicEdgeMap.size,
      };
    });
  }

  private calculateStrength(frequency: number): EdgeStrength {
    if (frequency >= 10) return 'STRONG';
    if (frequency >= 4) return 'MEDIUM';
    return 'WEAK';
  }

  /**
   * Generate a canonical label from concept preferred labels.
   * Used when upgrading LABEL_ONLY prerequisites to CONCEPT-BACKED.
   *
   * @param concepts - Array of concepts with preferredLabel
   * @returns Canonical name (e.g., "Superior orbital fissure + Maxillary nerve")
   */
  private generateCanonicalNameFromConcepts(
    concepts: Array<{ preferredLabel: string }>,
  ): string {
    return concepts
      .map((c) => c.preferredLabel)
      .sort() // Deterministic ordering
      .join(' + ');
  }

  /**
   * ================================
   * MERGE LABEL-ONLY PREREQUISITE
   * ================================
   *
   * WHY LABEL-ONLY PREREQUISITES EXIST:
   * - During AI analysis, we extract prerequisite labels like "maxillary nerve anatomy"
   * - At that time, we may not have resolved concept IDs yet (async process)
   * - So we create a LABEL_ONLY prerequisite with canonicalKey: "LABEL_ONLY::normalized-label"
   * - Status is NEEDS_REVIEW to signal admin intervention required
   * - These prerequisites have NO PrerequisiteConcept relations
   *
   * WHY MERGE IS AN UPGRADE, NOT DELETION:
   * - The prerequisite node already has topic edges (graph relationships)
   * - Deleting it would lose valuable learning graph data
   * - Instead, we UPGRADE it to become concept-backed
   * - If a duplicate concept-backed prerequisite exists, we MERGE into it
   *
   * HOW GRAPH INTEGRITY IS PRESERVED:
   * - All PrerequisiteTopicEdge relations are preserved/migrated
   * - Frequencies are aggregated (not lost)
   * - Edge strengths are recalculated based on combined frequencies
   * - Transaction ensures atomicity
   *
   * @param prerequisiteId - The LABEL_ONLY prerequisite to upgrade/merge
   * @param conceptIds - Admin-selected concept IDs (must not be empty)
   * @param adminLabel - Optional display name override
   * @throws Error if prerequisite is not LABEL_ONLY or conceptIds is empty
   * @returns Merged/upgraded prerequisite details
   */
  async mergeLabelOnlyPrerequisite(
    prerequisiteId: string,
    conceptIds: string[],
    adminLabel?: string,
  ): Promise<{
    success: true;
    action: 'MERGED' | 'UPGRADED';
    targetPrerequisiteId: string;
    targetCanonicalKey: string;
    edgesMigrated: number;
    conceptsLinked: number;
  }> {
    // ================================
    // VALIDATION
    // ================================
    if (!conceptIds || conceptIds.length === 0) {
      throw new Error('conceptIds cannot be empty');
    }

    // Remove duplicates and sort for deterministic key
    const uniqueConceptIds = [...new Set(conceptIds)].sort();

    return await this.prisma.$transaction(async (tx) => {
      // ================================
      // 1. LOAD SOURCE PREREQUISITE
      // ================================
      const sourcePrerequisite = await tx.prerequisite.findUnique({
        where: { id: prerequisiteId },
        include: {
          concepts: true,
          edges: true,
        },
      });

      if (!sourcePrerequisite) {
        throw new Error(`Prerequisite not found: ${prerequisiteId}`);
      }

      // Validate it's a LABEL_ONLY prerequisite
      if (!sourcePrerequisite.canonicalKey.startsWith('LABEL_ONLY::')) {
        throw new Error(
          `Prerequisite is not LABEL_ONLY. Current key: ${sourcePrerequisite.canonicalKey}`,
        );
      }

      if (sourcePrerequisite.status !== 'NEEDS_REVIEW') {
        throw new Error(
          `Prerequisite status must be NEEDS_REVIEW. Current: ${sourcePrerequisite.status}`,
        );
      }

      // ================================
      // 2. GENERATE NEW CANONICAL KEY
      // ================================
      const newCanonicalKey = `CONCEPT::${uniqueConceptIds.join('|')}`;

      // ================================
      // 3. FETCH CONCEPTS FOR NAMING
      // ================================
      const concepts = await tx.concept.findMany({
        where: {
          id: { in: uniqueConceptIds },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          preferredLabel: true,
        },
      });

      if (concepts.length !== uniqueConceptIds.length) {
        throw new Error(
          `Some concepts not found or inactive. Expected ${uniqueConceptIds.length}, found ${concepts.length}`,
        );
      }

      const canonicalName = this.generateCanonicalNameFromConcepts(concepts);
      const finalDisplayName =
        adminLabel?.trim() || sourcePrerequisite.displayName || canonicalName;

      // ================================
      // 4. CHECK FOR EXISTING CONCEPT-BACKED PREREQUISITE
      // ================================
      const existingTarget = await tx.prerequisite.findUnique({
        where: { canonicalKey: newCanonicalKey },
        include: {
          edges: true,
        },
      });

      // ================================
      // CASE A: MERGE INTO EXISTING TARGET
      // ================================
      if (existingTarget) {
        this.logger.log(
          `Merging LABEL_ONLY prerequisite ${prerequisiteId} into existing CONCEPT-BACKED ${existingTarget.id}`,
        );

        // Aggregate topic edges
        const edgeMap = new Map<string, number>();

        // Add existing target edges
        for (const edge of existingTarget.edges) {
          const key = `${edge.topicId}-${edge.subtopicId || 'null'}`;
          edgeMap.set(key, edge.frequency);
        }

        // Add source edges (accumulate frequencies)
        for (const edge of sourcePrerequisite.edges) {
          const key = `${edge.topicId}-${edge.subtopicId || 'null'}`;
          const currentFreq = edgeMap.get(key) || 0;
          edgeMap.set(key, currentFreq + edge.frequency);
        }

        // Delete old edges for the target
        await tx.prerequisiteTopicEdge.deleteMany({
          where: { prerequisiteId: existingTarget.id },
        });

        // Create updated edges with recalculated strengths
        let migratedEdgeCount = 0;
        for (const [key, frequency] of edgeMap.entries()) {
          const [topicId, subtopicIdStr] = key.split('-');
          const subtopicId = subtopicIdStr === 'null' ? null : subtopicIdStr;

          await tx.prerequisiteTopicEdge.create({
            data: {
              prerequisiteId: existingTarget.id,
              topicId,
              subtopicId,
              frequency,
              strength: this.calculateStrength(frequency),
              source: 'ADMIN_MERGE',
              lastUpdatedAt: new Date(),
            },
          });
          migratedEdgeCount++;
        }

        // Update target metadata if needed
        await tx.prerequisite.update({
          where: { id: existingTarget.id },
          data: {
            displayName: finalDisplayName,
            updatedAt: new Date(),
          },
        });

        // Delete source prerequisite (edges cascade)
        await tx.prerequisite.delete({
          where: { id: prerequisiteId },
        });

        this.logger.log(
          `Successfully merged ${migratedEdgeCount} edges into ${existingTarget.id}`,
        );

        return {
          success: true,
          action: 'MERGED',
          targetPrerequisiteId: existingTarget.id,
          targetCanonicalKey: newCanonicalKey,
          edgesMigrated: migratedEdgeCount,
          conceptsLinked: uniqueConceptIds.length,
        };
      }

      // ================================
      // CASE B: UPGRADE IN-PLACE
      // ================================
      this.logger.log(
        `Upgrading LABEL_ONLY prerequisite ${prerequisiteId} to CONCEPT-BACKED`,
      );

      // Update prerequisite to become concept-backed
      await tx.prerequisite.update({
        where: { id: prerequisiteId },
        data: {
          canonicalKey: newCanonicalKey,
          name: canonicalName,
          displayName: finalDisplayName,
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      });

      // Create PrerequisiteConcept links
      for (const conceptId of uniqueConceptIds) {
        await tx.prerequisiteConcept.create({
          data: {
            prerequisiteId: prerequisiteId,
            conceptId: conceptId,
          },
        });
      }

      // Update edge sources to reflect admin upgrade
      await tx.prerequisiteTopicEdge.updateMany({
        where: { prerequisiteId: prerequisiteId },
        data: {
          source: 'ADMIN_UPGRADE',
          lastUpdatedAt: new Date(),
        },
      });

      this.logger.log(
        `Successfully upgraded prerequisite ${prerequisiteId} with ${uniqueConceptIds.length} concepts`,
      );

      return {
        success: true,
        action: 'UPGRADED',
        targetPrerequisiteId: prerequisiteId,
        targetCanonicalKey: newCanonicalKey,
        edgesMigrated: sourcePrerequisite.edges.length,
        conceptsLinked: uniqueConceptIds.length,
      };
    });
  }
}
