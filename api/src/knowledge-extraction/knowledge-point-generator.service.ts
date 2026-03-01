/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { AIRouterService } from '../ai/ai-router.service';
import { AITaskType } from '../ai/types';
import {
  ApprovedContentGenerationInput,
  GeneratedKnowledgePointCandidate,
} from './knowledge-point.types';
import { TableExtractionStrategy } from './strategies/table-extraction.strategy';

interface RawModelKnowledgePoint {
  fact?: string;
  statement?: string;
  priority?: number;
  examRelevance?: number;
  classificationConfidence?: number;
}

interface RawModelResponse {
  knowledgePoints?: RawModelKnowledgePoint[];
  knowledge_points?: RawModelKnowledgePoint[];
}

@Injectable()
export class KnowledgePointGeneratorService {
  private readonly logger = new Logger(KnowledgePointGeneratorService.name);
  private readonly tableStrategy = new TableExtractionStrategy();

  constructor(private readonly aiRouter: AIRouterService) {}

  async generateFromApprovedContent(
    input: ApprovedContentGenerationInput,
  ): Promise<GeneratedKnowledgePointCandidate[]> {
    const maxKps = input.maxKnowledgePoints ?? 50;

    if (input.blockType === 'TABLE') {
      const { context, candidates } = this.tableStrategy.extract(
        input.content,
        input.tableData,
      );

      this.logger.debug(
        `TABLE extraction for ${input.approvedContentId}: type=${context.tableType}, mode=${context.extractionMode}, rows=${context.rowCount}, cols=${context.colCount}, candidates=${candidates.length}`,
      );

      return this.rankAndTrim(candidates, maxKps);
    }

    if (input.blockType === 'ALGORITHM') {
      return this.extractViaModel(input, maxKps, {
        strategyHint: 'ALGORITHM_DECISION_RULES',
      });
    }

    if (input.blockType === 'SPOT') {
      return this.extractViaModel(input, Math.min(maxKps, 5), {
        strategyHint: 'SPOT_HIGH_YIELD',
      });
    }

    return this.extractViaModel(input, maxKps, {
      strategyHint: 'TEXT_ATOMIC',
    });
  }

  private async extractViaModel(
    input: ApprovedContentGenerationInput,
    maxKps: number,
    extra: { strategyHint: string },
  ): Promise<GeneratedKnowledgePointCandidate[]> {
    const basePayload = {
      content: input.content,
      blockType: input.blockType,
      lesson: input.lessonName,
      topic: input.topicName,
      subtopic: input.subtopicName,
      maxKnowledgePoints: maxKps,
      strategyHint: extra.strategyHint,
      tableData: input.tableData,
      algorithmData: input.algorithmData,
      temperature: 0.2,
      outputSchema: {
        knowledgePoints: [
          {
            fact: 'string',
            priority: 'number',
            examRelevance: 'number',
            classificationConfidence: 'number',
          },
        ],
      },
    };

    const raw = await this.aiRouter.runTask(
      AITaskType.KNOWLEDGE_EXTRACTION,
      basePayload,
    );

    try {
      const parsed = this.validateModelResponse(raw);
      return this.rankAndTrim(parsed, maxKps);
    } catch (error) {
      this.logger.warn(
        `Invalid JSON from model for approvedContent ${input.approvedContentId}. Retrying with JSON fixer prompt.`,
      );

      const fixedRaw = await this.aiRouter.runTask(
        AITaskType.KNOWLEDGE_EXTRACTION,
        {
          ...basePayload,
          strictJsonInstruction:
            'Return ONLY valid JSON. Do not include explanations.',
          repairRawOutput: typeof raw === 'string' ? raw : JSON.stringify(raw),
        },
      );

      const repaired = this.validateModelResponse(fixedRaw);
      return this.rankAndTrim(repaired, maxKps);
    }
  }

  private validateModelResponse(
    raw: unknown,
  ): GeneratedKnowledgePointCandidate[] {
    const parsed = this.parseJsonObject(raw) as RawModelResponse;
    const list = parsed.knowledgePoints ?? parsed.knowledge_points ?? [];

    if (!Array.isArray(list)) {
      throw new Error('knowledgePoints must be an array');
    }

    const candidates: GeneratedKnowledgePointCandidate[] = [];

    for (const item of list) {
      const fact = (item.fact ?? item.statement ?? '').trim();
      if (!fact) continue;

      const priority = this.clampInt(item.priority ?? 3, 0, 10);
      const examRelevance = this.clamp(item.examRelevance ?? 0.75, 0, 1);
      const classificationConfidence = this.clamp(
        item.classificationConfidence ?? 0.8,
        0,
        1,
      );

      candidates.push({
        fact,
        priority,
        examRelevance,
        classificationConfidence,
        kind: 'ATOMIC',
      });
    }

    return candidates;
  }

  private parseJsonObject(raw: unknown): Record<string, unknown> {
    if (typeof raw === 'object' && raw !== null) {
      return raw as Record<string, unknown>;
    }

    if (typeof raw !== 'string') {
      throw new Error('Model response is not JSON-compatible');
    }

    const cleaned = raw
      .replace(/```json/gi, '```')
      .replace(/```/g, '')
      .trim();

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      throw new Error('No JSON object found in model output');
    }

    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  }

  private rankAndTrim(
    candidates: GeneratedKnowledgePointCandidate[],
    maxKps: number,
  ): GeneratedKnowledgePointCandidate[] {
    return candidates
      .sort((a, b) => {
        if (b.examRelevance !== a.examRelevance) {
          return b.examRelevance - a.examRelevance;
        }

        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }

        return b.classificationConfidence - a.classificationConfidence;
      })
      .slice(0, maxKps);
  }

  private clamp(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) return min;
    return Math.max(min, Math.min(max, value));
  }

  private clampInt(value: number, min: number, max: number): number {
    return Math.round(this.clamp(value, min, max));
  }
}
