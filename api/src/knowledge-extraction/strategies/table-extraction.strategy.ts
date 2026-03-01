/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
  GeneratedKnowledgePointCandidate,
  TableAnalysisContext,
  TableType,
} from '../knowledge-point.types';

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

const DIAGNOSTIC_HINTS = [
  'major',
  'minor',
  'kriter',
  'criteria',
  'threshold',
  'cutoff',
  'puan',
  'score',
  'tani',
  'tanı',
];

const DIRECT_FACT_HINTS = [
  'sinir',
  'kas',
  'arter',
  'ven',
  'foramen',
  'icerik',
  'içerik',
  'ligament',
  'tutunma',
  'innervasyon',
  'besledigi',
  'beslediği',
];

const FLOW_HINTS = ['adim', 'adım', 'step', 'faz', 'phase', 'evre'];

function safeString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function normalizeCell(value: unknown): string {
  return safeString(value).replace(/\s+/g, ' ').trim();
}

export function inferTableFromText(content: string): ParsedTable {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const markdownRows = lines.filter((line) => line.includes('|'));

  if (markdownRows.length >= 2) {
    const parsed = markdownRows.map((line) =>
      line
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0),
    );

    const headers = parsed[0] ?? [];
    const rows = parsed.slice(1).filter((row) => row.some((cell) => cell));
    return { headers, rows };
  }

  const listRows = lines
    .filter((line) => /^[-*•]|^\d+[.)]/.test(line))
    .map((line) => [line.replace(/^[-*•\d.)\s]+/, '').trim()])
    .filter((row) => row[0].length > 0);

  return {
    headers: listRows.length > 0 ? ['Madde'] : [],
    rows: listRows,
  };
}

export function parseTableData(
  tableData: unknown,
  content: string,
): ParsedTable {
  if (Array.isArray(tableData) && tableData.length > 0) {
    const first = tableData[0] as any;
    const headers = Array.isArray(first?.headers)
      ? first.headers.map((h: unknown) => normalizeCell(h)).filter(Boolean)
      : [];

    const rows = Array.isArray(first?.rows)
      ? first.rows
          .map((row: unknown) => {
            if (Array.isArray(row)) {
              return row.map((cell) => normalizeCell(cell));
            }

            if (row && typeof row === 'object') {
              return Object.values(row as Record<string, unknown>).map((cell) =>
                normalizeCell(cell),
              );
            }

            return [normalizeCell(row)];
          })
          .filter((row: string[]) => row.some((cell) => cell.length > 0))
      : [];

    return { headers, rows };
  }

  if (tableData && typeof tableData === 'object') {
    const asObj = tableData as any;
    const headers = Array.isArray(asObj.headers)
      ? asObj.headers.map((h: unknown) => normalizeCell(h)).filter(Boolean)
      : [];
    const rows = Array.isArray(asObj.rows)
      ? asObj.rows
          .map((row: unknown) =>
            Array.isArray(row)
              ? row.map((cell) => normalizeCell(cell))
              : [normalizeCell(row)],
          )
          .filter((row: string[]) => row.some((cell) => cell.length > 0))
      : [];

    if (headers.length > 0 || rows.length > 0) {
      return { headers, rows };
    }
  }

  return inferTableFromText(content);
}

export function detectTableType(
  headers: string[],
  rows: string[][],
  content: string,
): TableType {
  const joined = `${headers.join(' ')} ${rows.flat().join(' ')} ${content}`
    .toLowerCase()
    .replace(/\s+/g, ' ');

  const headerCount = headers.length;

  if (DIAGNOSTIC_HINTS.some((hint) => joined.includes(hint))) {
    return 'DIAGNOSTIC_CRITERIA';
  }

  if (FLOW_HINTS.some((hint) => joined.includes(hint))) {
    return 'MECHANISM_FLOW';
  }

  if (headerCount >= 2 && headerCount <= 4 && rows.length > 1) {
    if (DIRECT_FACT_HINTS.some((hint) => joined.includes(hint))) {
      return 'DIRECT_FACT';
    }

    if (headerCount >= 3) {
      return 'COMPARISON';
    }
  }

  if (headerCount <= 1 || rows.every((row) => row.length <= 2)) {
    return 'ENUMERATION';
  }

  return 'MIXED_OR_UNKNOWN';
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export class TableExtractionStrategy {
  analyze(content: string, tableData: unknown): TableAnalysisContext {
    const parsed = parseTableData(tableData, content);
    const rowCount = parsed.rows.length;
    const colCount = Math.max(
      parsed.headers.length,
      ...parsed.rows.map((r) => r.length),
      0,
    );

    const extractionMode: TableAnalysisContext['extractionMode'] =
      rowCount > 20 || colCount > 4 ? 'PATTERN_ONLY' : 'STANDARD';

    const tableType = detectTableType(parsed.headers, parsed.rows, content);

    return {
      rowCount,
      colCount,
      tableType,
      extractionMode,
    };
  }

  extract(
    content: string,
    tableData: unknown,
  ): {
    context: TableAnalysisContext;
    candidates: GeneratedKnowledgePointCandidate[];
  } {
    const parsed = parseTableData(tableData, content);
    const context = this.analyze(content, tableData);

    const candidates: GeneratedKnowledgePointCandidate[] = [];
    const headers = parsed.headers;
    const rows = parsed.rows;

    if (context.extractionMode === 'PATTERN_ONLY') {
      const patternCount = Math.min(6, Math.max(1, Math.ceil(rows.length / 8)));
      for (let i = 0; i < patternCount; i++) {
        candidates.push({
          fact: `Tablo, ${headers.join(' / ') || 'veri başlıkları'} ekseninde tekrarlayan örüntüler içerir (özet ${i + 1}).`,
          priority: 3,
          examRelevance: 0.78,
          classificationConfidence: 0.8,
          kind: 'PATTERN',
        });
      }

      return {
        context,
        candidates: candidates.slice(0, 16),
      };
    }

    switch (context.tableType) {
      case 'DIRECT_FACT': {
        for (const row of rows.slice(0, 30)) {
          if (row.length < 2) continue;
          const left = row[0];
          const right = row[1];
          if (!left || !right) continue;

          const relationLabel = headers[1] || 'ilişki';
          candidates.push({
            fact: `${left} için ${relationLabel.toLowerCase()} ${right} olarak verilir.`,
            priority: 4,
            examRelevance: 0.8,
            classificationConfidence: 0.84,
            kind: 'ROW',
          });
        }
        break;
      }

      case 'COMPARISON': {
        const headerSummary = headers.join(' ile ');
        if (headerSummary) {
          candidates.push({
            fact: `Karşılaştırma tablosu ${headerSummary} arasında ayırıcı özellikleri vurgular.`,
            priority: 4,
            examRelevance: 0.82,
            classificationConfidence: 0.82,
            kind: 'PATTERN',
          });
        }

        for (const row of rows.slice(0, 17)) {
          if (row.filter(Boolean).length < 2) continue;
          const key = row[0] || 'Özellik';
          const comparison = row.slice(1).filter(Boolean).join(' / ');
          candidates.push({
            fact: `${key} açısından karşılaştırılan fark: ${comparison}.`,
            priority: 4,
            examRelevance: 0.79,
            classificationConfidence: 0.8,
            kind: 'ROW',
          });

          if (candidates.length >= 18) break;
        }
        break;
      }

      case 'DIAGNOSTIC_CRITERIA': {
        for (const row of rows.slice(0, 15)) {
          const text = row.filter(Boolean).join(' - ');
          if (!text) continue;
          candidates.push({
            fact: `Tanı/puanlama kuralı: ${text}.`,
            priority: 5,
            examRelevance: 0.86,
            classificationConfidence: 0.82,
            kind: 'STEP',
          });
        }
        break;
      }

      case 'ENUMERATION': {
        const header = headers[0] || 'Küme';
        const items = rows.map((row) => row[0]).filter(Boolean);

        if (items.length > 0) {
          candidates.push({
            fact: `${header} başlığı altında ${items.length} öğelik bir küme tanımlanır.`,
            priority: 3,
            examRelevance: 0.74,
            classificationConfidence: 0.8,
            kind: 'PATTERN',
          });
        }

        for (const item of items.slice(0, 20)) {
          candidates.push({
            fact: `${header} kapsamında öğe: ${item}.`,
            priority: 3,
            examRelevance: 0.72,
            classificationConfidence: 0.8,
            kind: 'ROW',
          });
        }
        break;
      }

      case 'MECHANISM_FLOW': {
        for (const row of rows.slice(0, 20)) {
          const text = row.filter(Boolean).join(' -> ');
          if (!text) continue;
          candidates.push({
            fact: `Mekanizma/akış adımı: ${text}.`,
            priority: 4,
            examRelevance: 0.8,
            classificationConfidence: 0.82,
            kind: 'STEP',
          });
        }
        break;
      }

      default: {
        if (headers.length > 0) {
          candidates.push({
            fact: `Tablo ${headers.join(' / ')} başlıkları altında karma veri içerir.`,
            priority: 3,
            examRelevance: 0.7,
            classificationConfidence: 0.75,
            kind: 'PATTERN',
          });
        }

        for (const row of rows.slice(0, 10)) {
          const text = row.filter(Boolean).join(' - ');
          if (!text) continue;
          candidates.push({
            fact: `Satır düzeyi bilgi: ${text}.`,
            priority: 3,
            examRelevance: 0.71,
            classificationConfidence: 0.75,
            kind: 'ROW',
          });
        }
      }
    }

    return {
      context,
      candidates: candidates.map((c) => ({
        ...c,
        examRelevance: clamp01(c.examRelevance),
        classificationConfidence: clamp01(c.classificationConfidence),
      })),
    };
  }
}
