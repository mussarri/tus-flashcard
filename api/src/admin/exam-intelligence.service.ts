/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalysisStatus, EdgeStrength } from '@prisma/client';

export interface PatternFrequency {
  pattern: string;
  count: number;
  percentage: number;
  avgYear: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface TopicPatternRelation {
  topic: string;
  patterns: Array<{
    pattern: string;
    frequency: number;
    reliability: number; // 0-1, based on consistency
  }>;
  totalQuestions: number;
}

export interface PrerequisiteImpact {
  id: string;
  prerequisite: string;
  conceptIds?: string[];
  linkedTopics: string[];
  frequency: number;
  strength: 'WEAK' | 'MEDIUM' | 'STRONG';
  examImportance: number; // 0-100, based on how many questions require it
}

export interface YearlyTrend {
  year: number;
  totalQuestions: number;
  topTopics: Array<{
    topic: string;
    count: number;
    percentage: number;
  }>;
  topPatterns: Array<{
    patternType: string; // was: pattern
    count: number;
  }>;
  newTopics: string[];
}

export interface TrapHotspot {
  topic: string;
  trapType: string;
  frequency: number;
  confusionPairs: Array<{
    concept1: string;
    concept2: string;
    differentiator: string;
  }>;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ContentRecommendation {
  type: 'FLASHCARD' | 'QUESTION' | 'PREREQUISITE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  topic: string;
  topicName?: string;
  reasoning: string;
  metrics: {
    examFrequency: number;
    currentCoverage: number;
    gap: number;
  };
}

export interface ExamIntelligenceReport {
  metadata: {
    generatedAt: string;
    totalQuestionsAnalyzed: number;
    yearRange: { min: number; max: number };
    lessons: string[];
  };
  patternFrequency: PatternFrequency[];
  topicPatternMatrix: TopicPatternRelation[];
  prerequisiteImpact: PrerequisiteImpact[];
  yearlyTrends: YearlyTrend[];
  trapHotspots: TrapHotspot[];
  contentRecommendations: ContentRecommendation[];
}

@Injectable()
export class ExamIntelligenceService {
  private readonly logger = new Logger(ExamIntelligenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate comprehensive intelligence report from analyzed exam questions
   */
  async generateIntelligenceReport(
    lessonName?: string,
    startYear?: number,
    endYear?: number,
  ): Promise<ExamIntelligenceReport> {
    this.logger.log(
      `Generating exam intelligence report${lessonName ? ` for lesson: ${lessonName}` : ''}`,
    );

    // Build filter
    const where: any = {
      analysisStatus: AnalysisStatus.ANALYZED,
    };
    const lessonId = lessonName
      ? await this.prisma.lesson
          .findUnique({ where: { name: lessonName } })
          .then((l) => l?.id)
      : undefined;

    if (lessonId) {
      where.lessonId = lessonId;
    }

    if (startYear) {
      where.year = { ...where.year, gte: startYear };
    }

    if (endYear) {
      where.year = { ...where.year, lte: endYear };
    }

    // Fetch all analyzed questions
    const questions = await this.prisma.examQuestion.findMany({
      where,
      include: {
        knowledgePoints: {
          include: {
            knowledgePoint: true,
          },
        },
        lesson: true,
        topic: true,
        subtopic: true,
      },
      orderBy: { year: 'asc' },
    });

    if (questions.length === 0) {
      return {
        metadata: {
          generatedAt: new Date().toISOString(),
          totalQuestionsAnalyzed: 0,
          yearRange: { min: 0, max: 0 },
          lessons: [],
        },
        patternFrequency: [],
        topicPatternMatrix: [],
        prerequisiteImpact: [],
        yearlyTrends: [],
        trapHotspots: [],
        contentRecommendations: [],
      };
    }

    this.logger.log(`Analyzing ${questions.length} exam questions`);

    const lesson = lessonId
      ? await this.prisma.lesson.findUnique({ where: { id: lessonId } })
      : null;

    // Generate each section of the report
    const patternFrequency = this.calculatePatternFrequency(questions);
    const topicPatternMatrix = this.buildTopicPatternMatrix(questions);
    const prerequisiteImpact = await this.analyzePrerequisiteImpact(lessonId!);

    const yearlyTrends = this.analyzeYearlyTrends(questions);
    const trapHotspots = this.identifyTrapHotspots(questions);
    const contentRecommendations = await this.generateContentRecommendations(
      questions,
      lesson?.id,
    );

    // Extract metadata
    const years = questions.map((q) => q.year);
    const lessons = [
      ...new Set(
        questions
          .map((q) => q.lesson?.name)
          .filter((lesson): lesson is string => Boolean(lesson)),
      ),
    ];

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalQuestionsAnalyzed: questions.length,
        yearRange: {
          min: Math.min(...years),
          max: Math.max(...years),
        },
        lessons,
      },
      patternFrequency,
      topicPatternMatrix,
      prerequisiteImpact,
      yearlyTrends,
      trapHotspots,
      contentRecommendations,
    };
  }

  /**
   * Calculate pattern frequency across all questions
   */
  private calculatePatternFrequency(questions: any[]): PatternFrequency[] {
    const patternMap = new Map<
      string,
      {
        count: number;
        years: number[];
        topics: string[];
        confidences: number[];
      }
    >();

    for (const question of questions) {
      // Prefer patternType from database if available
      if (question.patternType) {
        const pattern = question.patternType;
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, {
            count: 0,
            years: [],
            topics: [],
            confidences: [],
          });
        }
        const entry = patternMap.get(pattern)!;
        entry.count++;
        entry.years.push(question.year);
        if (question.topic) entry.topics.push(question.topic.name);
        if (question.patternConfidence)
          entry.confidences.push(question.patternConfidence);
        continue;
      }

      // Fallback to analysisPayload for backward compatibility
      const analysis = question.analysisPayload as any;
      console.log(analysis.examTrap, 'examtrap');

      if (!analysis) continue;

      // Check if patternType exists in analysisPayload
      if (analysis.patternType) {
        const pattern = analysis.patternType;
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, {
            count: 0,
            years: [],
            topics: [],
            confidences: [],
          });
        }
        const entry = patternMap.get(pattern)!;
        entry.count++;
        entry.years.push(question.year);
        if (question.topic) entry.topics.push(question.topic.name);
        if (analysis.patternConfidence)
          entry.confidences.push(analysis.patternConfidence);
        continue;
      }

      // Extract patterns based on lesson type (legacy logic)
      const patterns: string[] = [];

      if (question.lesson?.toLowerCase() === 'anatomi') {
        // For anatomy: use spotRule, spatial context, etc.
        if (analysis.spotRule) patterns.push(analysis.spotRule);
        if (analysis.spatialContext) {
          patterns.push(...analysis.spatialContext);
        }
        if (analysis.examTrap?.confusedWith) {
          patterns.push(`Confusion: ${analysis.examTrap.confusedWith}`);
        }
      } else {
        // For other lessons: extract from traps and analysis
        if (Array.isArray(analysis.traps)) {
          patterns.push(
            ...analysis.traps.map((t: any) => t.reason || t.confusion),
          );
        }
        if (analysis.clinicalFindings) {
          patterns.push(...analysis.clinicalFindings);
        }
      }

      // Record patterns
      for (const pattern of patterns.filter(Boolean)) {
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, {
            count: 0,
            years: [],
            topics: [],
            confidences: [],
          });
        }
        const entry = patternMap.get(pattern)!;
        entry.count++;
        entry.years.push(question.year);
        if (question.topic) entry.topics.push(question.topic.name);
      }
    }

    // Calculate trend for each pattern
    const results: PatternFrequency[] = [];
    const totalQuestions = questions.length;

    for (const [pattern, data] of patternMap.entries()) {
      const avgYear = data.years.reduce((a, b) => a + b, 0) / data.years.length;
      const trend = this.calculateTrend(data.years);

      results.push({
        pattern,
        count: data.count,
        percentage: (data.count / totalQuestions) * 100,
        avgYear: Math.round(avgYear),
        trend,
      });
    }

    return results.sort((a, b) => b.count - a.count).slice(0, 50); // Top 50 patterns
  }

  /**
   * Build topic-pattern relationship matrix
   */
  private buildTopicPatternMatrix(questions: any[]): TopicPatternRelation[] {
    const topicMap = new Map<
      string,
      Map<string, { count: number; positions: number[]; confidences: number[] }>
    >();

    for (const question of questions) {
      const topic = question.topic?.name || 'Unknown';

      if (!topicMap.has(topic)) {
        topicMap.set(topic, new Map());
      }
      const patternMap = topicMap.get(topic)!;

      // Prefer patternType from database if available
      if (question.patternType) {
        const pattern = question.patternType;
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, { count: 0, positions: [], confidences: [] });
        }
        const entry = patternMap.get(pattern)!;
        entry.count++;
        if (question.patternConfidence)
          entry.confidences.push(question.patternConfidence);
        continue;
      }

      // Fallback to analysisPayload for backward compatibility
      const analysis = question.analysisPayload as any;
      if (!analysis) continue;

      // Check if patternType exists in analysisPayload
      if (analysis.patternType) {
        const pattern = analysis.patternType;
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, { count: 0, positions: [], confidences: [] });
        }
        const entry = patternMap.get(pattern)!;
        entry.count++;
        if (analysis.patternConfidence)
          entry.confidences.push(analysis.patternConfidence);
        continue;
      }

      // Extract patterns (legacy logic)
      const patterns: string[] = [];
      if (question.lesson?.toLowerCase() === 'anatomi') {
        if (analysis.spotRule) patterns.push(analysis.spotRule);
        if (analysis.spatialContext) patterns.push(...analysis.spatialContext);
      } else {
        if (Array.isArray(analysis.traps)) {
          patterns.push(
            ...analysis.traps.map((t: any) => t.reason || t.confusion),
          );
        }
      }

      // Record patterns for this topic
      for (const pattern of patterns.filter(Boolean)) {
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, { count: 0, positions: [], confidences: [] });
        }
        const entry = patternMap.get(pattern)!;
        entry.count++;
      }
    }

    // Build results
    const results: TopicPatternRelation[] = [];

    for (const [topic, patternMap] of topicMap.entries()) {
      const topicQuestions = questions.filter((q) => q.topic?.name === topic);
      const totalQuestions = topicQuestions.length;

      const patterns = Array.from(patternMap.entries())
        .map(([pattern, data]) => {
          // Calculate reliability: combine frequency with average confidence if available
          let reliability = data.count / totalQuestions;

          if (data.confidences.length > 0) {
            const avgConfidence =
              data.confidences.reduce((sum, c) => sum + c, 0) /
              data.confidences.length;
            // Weight reliability by AI confidence (50% frequency, 50% confidence)
            reliability = reliability * 0.5 + avgConfidence * 0.5;
          }

          return {
            pattern,
            frequency: data.count,
            reliability,
          };
        })
        .sort((a, b) => b.frequency - a.frequency);

      results.push({
        topic,
        patterns,
        totalQuestions,
      });
    }

    return results.sort((a, b) => b.totalQuestions - a.totalQuestions);
  }

  /**
   * Analyze prerequisite impact
   */
  private async analyzePrerequisiteImpact(
    lessonId: string,
  ): Promise<PrerequisiteImpact[]> {
    const edges = await this.prisma.prerequisiteTopicEdge.findMany({
      where: {
        topic: {
          lessonId: lessonId,
        },
      },
      include: {
        prerequisite: {
          include: {
            concepts: true,
          },
        },
        topic: true,
        subtopic: true,
      },
    });

    const map = new Map<
      string,
      {
        prerequisiteId: string;
        label: string;
        conceptIds: string[];
        topics: Set<string>;
        totalFrequency: number;
        maxStrength: EdgeStrength;
      }
    >();

    for (const edge of edges) {
      const prereq = edge.prerequisite;
      const key = prereq.id;

      if (!map.has(key)) {
        map.set(key, {
          prerequisiteId: prereq.id,
          label: prereq.name ?? prereq.canonicalKey,
          conceptIds: prereq.concepts.map((c) => c.conceptId),
          topics: new Set(),
          totalFrequency: 0,
          maxStrength: edge.strength,
        });
      }

      const entry = map.get(key)!;

      entry.topics.add(edge.topic.name);
      entry.totalFrequency += edge.frequency;

      // strength = MAX, not most common
      if (
        edge.strength === 'STRONG' ||
        (edge.strength === 'MEDIUM' && entry.maxStrength === 'WEAK')
      ) {
        entry.maxStrength = edge.strength;
      }
    }

    const totalQuestions = await this.prisma.examQuestion.count({
      where: {
        lesson: {
          id: lessonId,
        },
        analysisStatus: AnalysisStatus.ANALYZED,
      },
    });

    const results: PrerequisiteImpact[] = [];

    for (const entry of map.values()) {
      const examImportance =
        totalQuestions === 0
          ? 0
          : Math.min(100, (entry.totalFrequency / totalQuestions) * 100);

      results.push({
        id: entry.prerequisiteId,
        prerequisite: entry.label,
        conceptIds: entry.conceptIds.length ? entry.conceptIds : undefined,
        linkedTopics: Array.from(entry.topics),
        frequency: entry.totalFrequency,
        strength: entry.maxStrength,
        examImportance: Math.round(examImportance),
      });
    }

    return results.sort((a, b) => b.examImportance - a.examImportance);
  }
  /**
   * Analyze yearly trends
   */
  private analyzeYearlyTrends(questions: any[]): YearlyTrend[] {
    const yearMap = new Map<number, any[]>();

    // Group questions by year
    for (const question of questions) {
      if (!yearMap.has(question.year)) {
        yearMap.set(question.year, []);
      }
      yearMap.get(question.year)!.push(question);
    }

    const results: YearlyTrend[] = [];
    const topicFirstYear = new Map<string, number>();

    for (const [year, yearQuestions] of Array.from(yearMap.entries()).sort(
      (a, b) => a[0] - b[0],
    )) {
      // Count topics
      const topicCounts = new Map<string, number>();
      for (const q of yearQuestions) {
        const topic = q.topic || 'Unknown';
        topicCounts.set(topic.name, (topicCounts.get(topic.name) || 0) + 1);

        // Track first appearance
        if (!topicFirstYear.has(topic.name)) {
          topicFirstYear.set(topic.name, year);
        }
      }

      // Count patternType (preferred) with fallback
      const patternCounts = new Map<string, number>();
      for (const q of yearQuestions) {
        // ✅ 1) Prefer DB field
        let patternType: string | undefined = q.patternType;

        // ✅ 2) Fallback: analysisPayload.patternType
        if (!patternType) {
          const analysis = q.analysisPayload as any;
          if (analysis?.patternType) patternType = analysis.patternType;
        }

        // ✅ 3) Legacy fallback (optional): use spotRule as a legacy pattern label
        if (!patternType) {
          const analysis = q.analysisPayload as any;
          if (q.lesson === 'Anatomi' && analysis?.spotRule) {
            patternType = `LEGACY_SPOT_RULE:${analysis.spotRule}`;
          }
        }

        if (!patternType) continue;

        patternCounts.set(
          patternType,
          (patternCounts.get(patternType) || 0) + 1,
        );
      }

      // Identify new topics this year
      const newTopics = Array.from(topicCounts.keys()).filter(
        (topic) => topicFirstYear.get(topic) === year,
      );

      results.push({
        year,
        totalQuestions: yearQuestions.length,
        topTopics: Array.from(topicCounts.entries())
          .map(([topic, count]) => ({
            topic,
            count,
            percentage: (count / yearQuestions.length) * 100,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),

        // If you updated interface to patternType:
        topPatterns: Array.from(patternCounts.entries())
          .map(([patternType, count]) => ({ patternType, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),

        // If you DID NOT update interface (still {pattern, count}), use this instead:
        // topPatterns: Array.from(patternCounts.entries())
        //   .map(([patternType, count]) => ({ pattern: patternType, count }))
        //   .sort((a, b) => b.count - a.count)
        //   .slice(0, 5),

        newTopics,
      });
    }

    return results;
  }

  /**
   * Identify trap hotspots
   */
  private identifyTrapHotspots(questions: any[]): TrapHotspot[] {
    const topicTraps = new Map<
      string,
      Map<string, { count: number; confusions: any[] }>
    >();

    let questionsWithTraps = 0;
    let questionsWithAnalysis = 0;

    for (const question of questions) {
      const topic = question.topic || 'Unknown';
      const analysis = question.analysisPayload as any;

      if (!analysis) continue;

      questionsWithAnalysis++;

      if (!topicTraps.has(topic)) {
        topicTraps.set(topic, new Map());
      }
      const trapMap = topicTraps.get(topic)!;

      // Extract traps
      if (question.lesson?.name === 'Anatomi') {
        if (analysis.examTrap) {
          console.log(question);
          questionsWithTraps++;
          const trapType = 'Confusion';
          if (!trapMap.has(trapType)) {
            trapMap.set(trapType, { count: 0, confusions: [] });
          }
          const entry = trapMap.get(trapType)!;
          entry.count++;
          entry.confusions.push({
            concept1: question.options[question.correctAnswer] || '',
            concept2: analysis.examTrap.confusedWith,
            differentiator: analysis.examTrap.keyDifference,
          });
        }
      } else {
        if (Array.isArray(analysis.traps)) {
          if (analysis.traps.length > 0) {
            questionsWithTraps++;
          }
          for (const trap of analysis.traps) {
            const trapType = trap.reason || 'General';
            if (!trapMap.has(trapType)) {
              trapMap.set(trapType, { count: 0, confusions: [] });
            }
            const entry = trapMap.get(trapType)!;
            entry.count++;
            if (trap.confusion) {
              entry.confusions.push({
                concept1: question.topic,
                concept2: trap.confusion,
                differentiator: trap.reason,
              });
            }
          }
        }
      }
    }

    this.logger.log(
      `Trap Hotspots: ${questions.length} total questions, ${questionsWithAnalysis} with analysis, ${questionsWithTraps} with traps`,
    );

    const results: TrapHotspot[] = [];

    for (const [topic, trapMap] of topicTraps.entries()) {
      for (const [trapType, data] of trapMap.entries()) {
        const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
          data.count >= 5 ? 'HIGH' : data.count >= 3 ? 'MEDIUM' : 'LOW';

        results.push({
          topic,
          trapType,
          frequency: data.count,
          confusionPairs: data.confusions.slice(0, 5), // Top 5 confusions
          riskLevel,
        });
      }
    }

    this.logger.log(`Generated ${results.length} trap hotspots`);

    return results.sort((a, b) => b.frequency - a.frequency).slice(0, 30); // Top 30 hotspots
  }

  /**
   * Generate content recommendations
   */
  private async generateContentRecommendations(
    questions: any[],
    lessonId?: string,
  ): Promise<ContentRecommendation[]> {
    const recommendations: ContentRecommendation[] = [];

    // Count topics and their frequency
    const topicFrequency = new Map<string, number>();
    for (const q of questions) {
      if (q.topicId) {
        topicFrequency.set(q.topicId, (topicFrequency.get(q.topicId) || 0) + 1);
      }
    }

    // Check flashcard coverage
    for (const [topicId, frequency] of topicFrequency.entries()) {
      const flashcardCount = await this.prisma.flashcard.count({
        where: {
          knowledgePoint: {
            topicId: topicId,
          },
          approvalStatus: 'APPROVED',
        },
      });

      const gap = frequency * 5 - flashcardCount; // Target: 5 flashcards per question
      if (gap > 0) {
        recommendations.push({
          type: 'FLASHCARD',
          priority: frequency >= 5 ? 'HIGH' : frequency >= 3 ? 'MEDIUM' : 'LOW',
          topic: topicId,
          topicName: await this.prisma.topic
            .findUnique({ where: { id: topicId } })
            .then((t) => t?.name || topicId),
          reasoning: `Topic appears in ${frequency} exam questions but has only ${flashcardCount} flashcards. Need ${gap} more.`,
          metrics: {
            examFrequency: frequency,
            currentCoverage: flashcardCount,
            gap,
          },
        });
      }
    }

    // Check question coverage
    for (const [topicId, frequency] of topicFrequency.entries()) {
      const questionCard = await this.prisma.questionCard.count({
        where: {
          questionKnowledgePoints: {
            some: {
              knowledgePoint: {
                topicId: topicId,
              },
            },
          },
          approvalStatus: 'APPROVED',
        },
      });

      const gap = frequency * 3 - questionCard; // Target: 3 practice questions per exam question
      if (gap > 0) {
        recommendations.push({
          type: 'QUESTION',
          priority: frequency >= 5 ? 'HIGH' : frequency >= 3 ? 'MEDIUM' : 'LOW',
          topic: topicId,
          topicName: await this.prisma.topic
            .findUnique({ where: { id: topicId } })
            .then((t) => t?.name || topicId),
          reasoning: `Topic appears in ${frequency} exam questions but has only ${questionCard} practice questions. Need ${gap} more.`,
          metrics: {
            examFrequency: frequency,
            currentCoverage: questionCard,
            gap,
          },
        });
      }
    }

    const lesson = lessonId
      ? await this.prisma.lesson.findUnique({ where: { id: lessonId } })
      : null;

    // Check prerequisite coverage (anatomy only)
    if (lesson?.name === 'Anatomi' || !lessonId) {
      const prerequisiteTopics = await this.prisma.topic.findMany({
        where: {
          lesson: {
            name: 'Anatomi',
          },
        },
        include: {
          prerequisiteEdges: {
            include: {
              prerequisite: true,
            },
          },
        },
      });

      for (const topic of prerequisiteTopics) {
        const strongPrereqs = topic.prerequisiteEdges.filter(
          (e) => e.strength === 'STRONG',
        );
        if (strongPrereqs.length > 0) {
          const examFreq = topicFrequency.get(topic.id) || 0;
          if (examFreq >= 3) {
            recommendations.push({
              type: 'PREREQUISITE',
              priority: examFreq >= 5 ? 'HIGH' : 'MEDIUM',
              topic: topic.id,
              topicName: topic.name,
              reasoning: `Topic has ${strongPrereqs.length} strong prerequisites. Ensure prerequisite content is complete.`,
              metrics: {
                examFrequency: examFreq,
                currentCoverage: strongPrereqs.length,
                gap: 0,
              },
            });
          }
        }
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate trend from years array
   */
  private calculateTrend(
    years: number[],
  ): 'increasing' | 'decreasing' | 'stable' {
    if (years.length < 3) return 'stable';

    // Split into two halves and compare averages
    const mid = Math.floor(years.length / 2);
    const firstHalf = years.slice(0, mid);
    const secondHalf = years.slice(mid);

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = avgSecond - avgFirst;

    if (diff > 1) return 'increasing';
    if (diff < -1) return 'decreasing';
    return 'stable';
  }
}
