import { Injectable, Logger } from '@nestjs/common';
import { AIRouterService } from '../ai/ai-router.service';
import { AITaskType } from '../ai/types';
import {
  ApprovedContentGenerationInput,
  GeneratedKnowledgePointCandidate,
  TableType,
} from './knowledge-point.types';
import {
  chunkTable,
  parseTables,
  ParsedTable,
} from './strategies/table-extraction.strategy';

interface RawModelKnowledgePoint {
  fact?: string;
  text?: string;
  statement?: string;
  priority?: number;
  examRelevance?: number;
  classificationConfidence?: number;
}

interface RawModelResponse {
  knowledgePoints?: RawModelKnowledgePoint[];
  knowledge_points?: RawModelKnowledgePoint[];
  knowledgepoints?: RawModelKnowledgePoint[];
}

@Injectable()
export class KnowledgePointGeneratorService {
  private readonly logger = new Logger(KnowledgePointGeneratorService.name);

  constructor(private readonly aiRouter: AIRouterService) {}
  async generateFromApprovedContent(
    input: ApprovedContentGenerationInput,
  ): Promise<GeneratedKnowledgePointCandidate[]> {
    const requestedMax = input.maxKnowledgePoints ?? 50;
    const maxKps = Math.max(1, requestedMax);
    const effectiveMax =
      input.blockType === 'SPOT' ? Math.min(maxKps, 12) : maxKps;

    let candidates: GeneratedKnowledgePointCandidate[];

    if (input.blockType === 'TABLE') {
      const tables = parseTables(input.tableData, input.content);
      if (!tables.length) throw new Error('TABLE content has no readable rows');
      candidates = [];
      for (const [tableIndex, table] of tables.entries()) {
        const tableType = await this.classifyTableType(table, input);
        const chunks = chunkTable(table, 8, 3500);
        this.logger.debug(
          `TABLE extraction for ${input.approvedContentId}: table=${tableIndex + 1}, type=${tableType}, rows=${table.rows.length}, chunks=${chunks.length}`,
        );
        for (const chunk of chunks) {
          const extracted = await this.extractViaModel(
            {
              ...input,
              content: JSON.stringify({
                tableType,
                lesson: input.lessonName,
                topic: input.topicName,
                headers: chunk.headers,
                rows: chunk.rows,
              }),
            },
            effectiveMax,
            { strategyHint: `TABLE_${tableType}` },
          );
          if (!extracted.length) {
            this.logger.warn(
              `TABLE extraction returned no KPs for ${input.approvedContentId}: table=${tableIndex + 1}, chunkRows=${chunk.rows.length}`,
            );
          }
          candidates.push(...extracted);
        }
      }
    } else {
      const strategyHint =
        input.blockType === 'ALGORITHM'
          ? 'ALGORITHM_DECISION_RULES'
          : input.blockType === 'SPOT'
            ? 'SPOT_HIGH_YIELD_ATOMIC'
            : 'MARKDOWN_SUMMARY_ATOMIC_MAX_COVERAGE';

      candidates = await this.extractViaModel(input, effectiveMax, {
        strategyHint,
      });
    }

    // Burada yalnızca birebir aynı fact'leri temizliyoruz.
    // Anlamsal birleştirme model promptunun görevi.
    const unique = new Map<string, GeneratedKnowledgePointCandidate>();

    for (const candidate of candidates) {
      const key = candidate.fact
        .toLocaleLowerCase('tr-TR')
        .replace(/\s+/g, ' ')
        .replace(/[.!?]+$/, '')
        .trim();

      const existing = unique.get(key);

      if (!existing || candidate.priority > existing.priority) {
        unique.set(key, candidate);
      }
    }

    const deduped = [...unique.values()];
    // TABLE chunks have separate output budgets. A global cap would silently
    // discard facts from later rows after every chunk has been processed.
    return this.rankAndTrim(
      deduped,
      input.blockType === 'TABLE' ? deduped.length : effectiveMax,
    );
  }

  private async classifyTableType(
    table: ParsedTable,
    input: ApprovedContentGenerationInput,
  ): Promise<TableType> {
    const sampleCount = Math.min(table.rows.length, 15);
    const sampleIndexes = Array.from({ length: sampleCount }, (_, index) =>
      Math.round((index * (table.rows.length - 1)) / (sampleCount - 1 || 1)),
    );
    const sample = {
      lesson: input.lessonName,
      topic: input.topicName,
      headers: table.headers,
      rows: sampleIndexes.map((index) => table.rows[index]),
    };
    const raw: unknown = await this.aiRouter.runTask(
      AITaskType.CONTENT_CLASSIFY,
      {
        classifyTableType: true,
        table: sample,
      },
    );
    let parsed: unknown;
    try {
      parsed =
        typeof raw === 'string'
          ? JSON.parse(
              raw
                .trim()
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```$/, ''),
            )
          : raw;
    } catch {
      throw new Error('AI returned invalid table classification JSON');
    }
    const type = (parsed as { tableType?: unknown } | null)?.tableType;
    const allowed: TableType[] = [
      'DIRECT_FACT',
      'DIAGNOSTIC_CRITERIA',
      'COMPARISON',
      'ENUMERATION',
      'MECHANISM_FLOW',
      'MIXED_OR_UNKNOWN',
    ];
    if (!allowed.includes(type as TableType)) {
      throw new Error('AI returned an unknown table type');
    }
    return type as TableType;
  }

  private async extractViaModel(
    input: ApprovedContentGenerationInput,
    maxKps: number,
    extra: { strategyHint: string },
  ): Promise<GeneratedKnowledgePointCandidate[]> {
    // Algoritmanın yapılandırılmış hâli varsa koşulları kaybetmemek için
    // promptun okuduğu content alanına da ekliyoruz.
    const content =
      input.blockType === 'ALGORITHM' && input.algorithmData
        ? `${input.content}\n\nYapılandırılmış algoritma:\n${JSON.stringify(
            input.algorithmData,
          )}`
        : input.content;

    const payload = {
      content,
      blockType: input.blockType,
      lesson: input.lessonName,
      topic: input.topicName,
      subtopic: input.subtopicName,
      maxKnowledgePoints: maxKps,
      strategyHint: extra.strategyHint,
      tableData: input.tableData,
      algorithmData: input.algorithmData,
      temperature: 0.1,
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

    const raw: unknown = await this.aiRouter.runTask(
      AITaskType.KNOWLEDGE_EXTRACTION,
      payload,
    );

    return this.parseKnowledgePoints(raw);
  }

  private parseKnowledgePoints(
    raw: unknown,
  ): GeneratedKnowledgePointCandidate[] {
    const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('KP çıktısı nesne değil.');
    }

    const knowledgePoints = (parsed as Record<string, unknown>).knowledgePoints;

    if (!Array.isArray(knowledgePoints)) {
      throw new Error('KP çıktısında knowledgePoints dizisi yok.');
    }

    return knowledgePoints.map((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new Error(`KP[${index}] geçersiz.`);
      }

      const point = item as Record<string, unknown>;

      if (
        typeof point.fact !== 'string' ||
        !point.fact.trim() ||
        typeof point.priority !== 'number' ||
        !Number.isInteger(point.priority) ||
        point.priority < 0 ||
        point.priority > 10 ||
        typeof point.examRelevance !== 'number' ||
        point.examRelevance < 0 ||
        point.examRelevance > 1 ||
        typeof point.classificationConfidence !== 'number' ||
        point.classificationConfidence < 0 ||
        point.classificationConfidence > 1
      ) {
        throw new Error(`KP[${index}] şemaya uymuyor.`);
      }

      return {
        fact: point.fact.trim(),
        priority: point.priority,
        examRelevance: point.examRelevance,
        classificationConfidence: point.classificationConfidence,
      } as GeneratedKnowledgePointCandidate;
    });
  }

  private validateModelResponse(
    raw: unknown,
  ): GeneratedKnowledgePointCandidate[] {
    const parsed = this.parseJsonObject(raw) as RawModelResponse;

    const list =
      parsed?.knowledgePoints ??
      parsed?.knowledge_points ??
      parsed?.knowledgepoints ??
      [];

    if (!Array.isArray(list)) {
      throw new Error('knowledgePoints must be an array');
    }

    const candidates: GeneratedKnowledgePointCandidate[] = [];

    for (const item of list) {
      if (!item || typeof item !== 'object') continue;

      const rawFact = item.fact ?? item.statement ?? item.text;
      const fact =
        typeof rawFact === 'string'
          ? rawFact.trim()
          : String(rawFact ?? '').trim();

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

    if (candidates.length === 0) {
      throw new Error('No valid knowledgePoints found in model output');
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

    const cleaned = this.cleanModelOutput(raw);

    const candidates: string[] = [];
    const pushCandidate = (value?: string | null) => {
      if (!value) return;
      const trimmed = value.trim();
      if (!trimmed) return;
      if (!candidates.includes(trimmed)) {
        candidates.push(trimmed);
      }
    };

    pushCandidate(cleaned);

    const extractedBalanced = this.extractBalancedJsonObject(cleaned);
    pushCandidate(extractedBalanced);

    const extractedLoose = this.extractJsonObject(cleaned);
    pushCandidate(extractedLoose);

    for (const candidate of [...candidates]) {
      pushCandidate(this.applyHeuristicJsonRepairs(candidate));
    }

    for (const candidate of candidates) {
      const parsed = this.safeParseObject(candidate);
      if (parsed) return parsed;
    }

    throw new Error('Invalid JSON in model output after repair attempts');
  }

  private cleanModelOutput(input: string): string {
    return input
      .replace(/\uFEFF/g, '')
      .replace(/[\u200B-\u200D\u2060]/g, '')
      .replace(/```(?:json)?/gi, '')
      .replace(/```/g, '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim();
  }

  private extractBalancedJsonObject(input: string): string | null {
    const start = input.indexOf('{');
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < input.length; i++) {
      const ch = input[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '{') depth++;
      if (ch === '}') depth--;

      if (depth === 0) {
        return input.slice(start, i + 1).trim();
      }
    }

    return null;
  }

  private extractJsonObject(text: string): string | null {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    return text.slice(start, end + 1);
  }

  private safeParseObject(text: string): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
  private applyHeuristicJsonRepairs(text: string): string {
    let s = text.trim();

    // Normalize smart quotes and zero-width chars
    s = s
      .replace(/\uFEFF/g, '')
      .replace(/[\u200B-\u200D\u2060]/g, '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");

    // Remove markdown fences if they somehow remain
    s = s.replace(/```(?:json)?/gi, '').replace(/```/g, '');

    // Normalize line endings / tabs
    s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\t/g, ' ');

    // Remove trailing commas before } or ]
    s = s.replace(/,\s*([}\]])/g, '$1');

    // Remove invalid control chars except useful whitespace
    s = Array.from(s)
      .filter((ch) => {
        const code = ch.charCodeAt(0);
        return code === 0x0a || code === 0x09 || code > 0x1f;
      })
      .join('');

    return s.trim();
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

  private clamp(value: unknown, min: number, max: number): number {
    const numeric =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : Number.NaN;

    if (!Number.isFinite(numeric)) return min;
    return Math.max(min, Math.min(max, numeric));
  }

  private clampInt(value: unknown, min: number, max: number): number {
    return Math.round(this.clamp(value, min, max));
  }

  // async generateFromApprovedContent(
  //   input: ApprovedContentGenerationInput,
  // ): Promise<GeneratedKnowledgePointCandidate[]> {
  //   const maxKps = input.maxKnowledgePoints ?? 50;

  //   if (input.blockType === 'TABLE') {
  //     const { context, candidates } = this.tableStrategy.extract(
  //       input.content,
  //       input.tableData,
  //     );

  //     this.logger.debug(
  //       `TABLE extraction for ${input.approvedContentId}: type=${context.tableType}, mode=${context.extractionMode}, rows=${context.rowCount}, cols=${context.colCount}, candidates=${candidates.length}`,
  //     );

  //     return this.rankAndTrim(candidates, maxKps);
  //   }

  //   if (input.blockType === 'ALGORITHM') {
  //     return this.extractViaModel(input, maxKps, {
  //       strategyHint: 'ALGORITHM_DECISION_RULES',
  //     });
  //   }

  //   if (input.blockType === 'SPOT') {
  //     return this.extractViaModel(input, Math.min(maxKps, 12), {
  //       strategyHint: 'SPOT_HIGH_YIELD_ATOMIC',
  //     });
  //   }

  //   return this.extractViaModel(input, maxKps, {
  //     strategyHint: 'MARKDOWN_SUMMARY_ATOMIC_MAX_COVERAGE',
  //   });
  // }

  // private async extractViaModel(
  //   input: ApprovedContentGenerationInput,
  //   maxKps: number,
  //   extra: { strategyHint: string },
  // ): Promise<GeneratedKnowledgePointCandidate[]> {
  //   const basePayload = {
  //     content: input.content,
  //     blockType: input.blockType,
  //     lesson: input.lessonName,
  //     topic: input.topicName,
  //     subtopic: input.subtopicName,
  //     maxKnowledgePoints: maxKps,
  //     strategyHint: extra.strategyHint,
  //     tableData: input.tableData,
  //     algorithmData: input.algorithmData,
  //     temperature: 0.1,
  //     outputSchema: {
  //       knowledgePoints: [
  //         {
  //           fact: 'string',
  //           priority: 'number',
  //           examRelevance: 'number',
  //           classificationConfidence: 'number',
  //         },
  //       ],
  //     },
  //   };

  //   const raw = await this.aiRouter.runTask(
  //     AITaskType.KNOWLEDGE_EXTRACTION,
  //     basePayload,
  //   );

  //   try {
  //     const parsed = this.validateModelResponse(raw);
  //     return this.rankAndTrim(parsed, maxKps);
  //   } catch {
  //     const rawText =
  //       typeof raw === 'string' ? raw : JSON.stringify(raw ?? null);

  //     this.logger.warn(
  //       `Invalid JSON from model for approvedContent ${input.approvedContentId}. Retrying with compact JSON mode.`,
  //     );

  //     this.logger.warn(
  //       `[KP RAW OUTPUT][${input.approvedContentId}] ${String(rawText).slice(
  //         0,
  //         4000,
  //       )}`,
  //     );

  //     this.logger.warn(
  //       `[KP RAW TAIL][${input.approvedContentId}] ${String(rawText).slice(-500)}`,
  //     );

  //     const retryRaw = await this.aiRouter.runTask(
  //       AITaskType.KNOWLEDGE_EXTRACTION,
  //       {
  //         ...basePayload,
  //         maxKnowledgePoints: Math.min(maxKps, 12),
  //         strategyHint: 'COMPACT_JSON_ATOMIC',
  //         temperature: 0,
  //       },
  //     );

  //     this.logger.warn(
  //       `[KP RETRY OUTPUT][${input.approvedContentId}] ${String(
  //         typeof retryRaw === 'string' ? retryRaw : JSON.stringify(retryRaw),
  //       ).slice(0, 4000)}`,
  //     );

  //     try {
  //       const retried = this.validateModelResponse(retryRaw);
  //       return this.rankAndTrim(retried, maxKps);
  //     } catch {
  //       this.logger.warn(
  //         `Compact JSON retry failed for approvedContent ${input.approvedContentId}. Retrying with repair mode.`,
  //       );
  //     }

  //     const fixedRaw = await this.aiRouter.runTask(
  //       AITaskType.KNOWLEDGE_EXTRACTION,
  //       {
  //         repairRawOutput: rawText,
  //         lesson: input.lessonName,
  //         temperature: 0,
  //       },
  //     );

  //     this.logger.warn(
  //       `[KP REPAIRED OUTPUT][${input.approvedContentId}] ${String(
  //         typeof fixedRaw === 'string' ? fixedRaw : JSON.stringify(fixedRaw),
  //       ).slice(0, 4000)}`,
  //     );

  //     const repaired = this.validateModelResponse(fixedRaw);
  //     return this.rankAndTrim(repaired, maxKps);
  //   }
  // }
}
