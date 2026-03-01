import * as crypto from 'crypto';

const TURKISH_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  Ç: 'c',
  Ğ: 'g',
  İ: 'i',
  Ö: 'o',
  Ş: 's',
  Ü: 'u',
};

const STOPWORDS = new Set([
  // TR
  've',
  'veya',
  'ile',
  'icin',
  'bu',
  'su',
  'bir',
  'de',
  'da',
  'mi',
  'mu',
  'mü',
  'ama',
  'fakat',
  'gibi',
  'olan',
  'olarak',
  'en',
  'daha',
  'cok',
  'az',
  // EN
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'for',
  'to',
  'in',
  'on',
  'with',
  'by',
  'is',
  'are',
]);

function normalizeTurkish(text: string): string {
  return text
    .split('')
    .map((ch) => TURKISH_MAP[ch] ?? ch)
    .join('');
}

function normalizeSegment(value?: string): string {
  if (!value) return '';

  const normalized = normalizeTurkish(value.toLowerCase())
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
    .join('_');

  return normalized;
}

/**
 * Stable normalized key for KnowledgePoint deduplication.
 * Format: <lesson>_<topic>_<fact_tokens>
 */
export function buildNormalizedKey(
  lesson: string | undefined,
  topic: string | undefined,
  fact: string,
): string {
  const lessonPart = normalizeSegment(lesson);
  const topicPart = normalizeSegment(topic);
  const factPart = normalizeSegment(fact);

  let combined = [lessonPart, topicPart, factPart]
    .filter((part) => part.length > 0)
    .join('_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  if (!combined || combined.length < 6) {
    const hash = crypto
      .createHash('sha256')
      .update(`${lesson ?? ''}|${topic ?? ''}|${fact}`)
      .digest('hex')
      .slice(0, 24);
    combined = `kp_${hash}`;
  }

  if (combined.length > 120) {
    combined = combined.slice(0, 120).replace(/_+$/g, '');
  }

  return combined;
}
