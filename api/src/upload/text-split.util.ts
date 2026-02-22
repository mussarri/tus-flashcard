/**
 * Text Split Utilities for Manual Batch Processing
 *
 * Deterministically splits raw pasted text into non-empty string chunks
 * based on the selected split strategy.
 */

export type SplitStrategy = 'LINES' | 'BULLETS' | 'PARAGRAPHS' | 'AUTO';

/** Bullet pattern: -, *, •, or numbered (1. / 1) / 1-) at start of line */
const BULLET_RE = /^\s*(?:[-*\u2022]|(?:\d+[.)]\s)|(?:\d+-\s))/;

/**
 * Normalize raw text:
 *  - trim leading/trailing whitespace
 *  - collapse Windows-style CRLF to LF
 *  - collapse 3+ consecutive blank lines to 2 (preserve paragraph breaks)
 */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Count lines that start with a bullet marker.
 */
function countBulletLines(lines: string[]): number {
  return lines.filter((l) => BULLET_RE.test(l)).length;
}

/**
 * Strip the leading bullet marker and trim the chunk.
 */
function stripBulletMarker(line: string): string {
  return line.replace(/^\s*(?:[-*•]|\d+[.)]\s|\d+-\s)\s*/, '').trim();
}

/**
 * Split by newlines; keep any non-empty line.
 */
export function splitByLines(text: string): string[] {
  return normalizeText(text)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/**
 * Split by bullet / numbered-list markers.
 * Lines that are NOT bullets are joined to the previous block (continuation text).
 * If the text has no bullet markers at all we fall back to splitByLines.
 */
export function splitByBullets(text: string): string[] {
  const lines = normalizeText(text).split('\n');

  if (countBulletLines(lines) === 0) {
    return splitByLines(text);
  }

  const chunks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (BULLET_RE.test(line)) {
      if (current.length > 0) {
        chunks.push(current.join(' ').trim());
      }
      current = [stripBulletMarker(line)];
    } else {
      // Continuation of current bullet
      current.push(trimmed);
    }
  }

  if (current.length > 0) {
    chunks.push(current.join(' ').trim());
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Split by blank lines (paragraph breaks).
 * Each paragraph is collapsed to a single string (internal newlines → space).
 */
export function splitByParagraphs(text: string): string[] {
  return normalizeText(text)
    .split(/\n\n+/)
    .map((para) =>
      para
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .join(' ')
        .trim(),
    )
    .filter((p) => p.length > 0);
}

/**
 * AUTO strategy:
 *  - If ≥ 30 % of non-empty lines start with a bullet marker → BULLETS
 *  - Else if the text has ≥ 1 blank-line paragraph break → PARAGRAPHS
 *  - Else → LINES
 */
export function splitAuto(text: string): string[] {
  const normalized = normalizeText(text);
  const lines = normalized.split('\n').filter((l) => l.trim().length > 0);
  const bulletRatio =
    lines.length > 0 ? countBulletLines(lines) / lines.length : 0;

  if (bulletRatio >= 0.3) {
    return splitByBullets(text);
  }

  const hasParagraphBreaks = /\n\n/.test(normalized);
  if (hasParagraphBreaks) {
    return splitByParagraphs(text);
  }

  return splitByLines(text);
}

/**
 * Split raw text using the given strategy.
 */
export function splitText(text: string, strategy: SplitStrategy): string[] {
  switch (strategy) {
    case 'LINES':
      return splitByLines(text);
    case 'BULLETS':
      return splitByBullets(text);
    case 'PARAGRAPHS':
      return splitByParagraphs(text);
    case 'AUTO':
    default:
      return splitAuto(text);
  }
}
