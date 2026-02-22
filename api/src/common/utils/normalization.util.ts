import * as crypto from 'crypto';

/**
 * Turkish character normalization mapping
 * Converts Turkish characters to their ASCII equivalents
 */
const TURKISH_CHAR_MAP: Record<string, string> = {
  // Lowercase Turkish
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  // Uppercase Turkish
  Ç: 'C',
  Ğ: 'G',
  İ: 'I',
  Ö: 'O',
  Ş: 'S',
  Ü: 'U',
};

/**
 * Normalize Turkish characters in text
 * @param text Input text with potential Turkish characters
 * @returns Text with Turkish characters converted to ASCII equivalents
 */
export function normalizeTurkishCharacters(text: string): string {
  return text.replace(/./g, (char) => TURKISH_CHAR_MAP[char] || char);
}

/**
 * Compute normalized key for deduplication
 * Process:
 * 1. Lowercase
 * 2. Turkish character normalization
 * 3. Remove punctuation (keep spaces)
 * 4. Collapse multiple whitespace to single space
 * 5. Trim
 * 6. SHA256 hash
 *
 * @param text The text to normalize (typically a KP fact)
 * @returns SHA256 hash of the normalized text
 */
export function computeNormalizedKey(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Input text must be a non-empty string');
  }

  // Step 1: Lowercase
  let normalized = text.toLowerCase();

  // Step 2: Turkish character normalization
  normalized = normalizeTurkishCharacters(normalized);

  // Step 3: Remove punctuation but keep spaces
  // Keep alphanumeric, spaces, and common anatomical terms (Latin letters with accents if any)
  normalized = normalized.replace(/[^\w\s-]/g, '');

  // Step 4: Collapse multiple whitespace to single space
  normalized = normalized.replace(/\s+/g, ' ');

  // Step 5: Trim
  normalized = normalized.trim();

  // Step 6: SHA256 hash
  const hash = crypto
    .createHash('sha256')
    .update(normalized, 'utf-8')
    .digest('hex');

  return hash;
}

/**
 * Get the normalized text (without hashing) for debugging
 * Useful for checking if two texts normalize to the same intermediate form
 *
 * @param text The text to normalize
 * @returns Normalized text (not hashed)
 */
export function normalizeTextPreview(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let normalized = text.toLowerCase();
  normalized = normalizeTurkishCharacters(normalized);
  normalized = normalized.replace(/[^\w\s-]/g, '');
  normalized = normalized.replace(/\s+/g, ' ');
  normalized = normalized.trim();

  return normalized;
}

/**
 * Fast heuristic check for atomicity suspicion
 * Returns a suspicion score (0-1) for whether a KP might be non-atomic
 * High score = likely non-atomic
 *
 * Heuristics:
 * - Contains multiple sentences (ends with multiple periods)
 * - Very long (>150 chars typically indicates multiple facts)
 * - Contains conjunctions indicating combined facts (and, or, also)
 * - Contains list markers (-, •, numbers followed by dots)
 *
 * @param fact The KP fact text
 * @returns Suspicion score 0-1 (0 = likely atomic, 1 = definitely non-atomic)
 */
export function getAtomicitySuspicionScore(fact: string): number {
  if (!fact || fact.trim().length === 0) {
    return 0;
  }

  let suspicionScore = 0;

  // Check for multiple sentences
  const sentenceCount = (fact.match(/[.!?]+/g) || []).length;
  if (sentenceCount > 1) {
    suspicionScore += 0.4; // Strong indicator of multiple facts
  }

  // Check length (very long facts often contain multiple facts)
  const charCount = fact.length;
  if (charCount > 180) {
    suspicionScore += 0.2;
  } else if (charCount > 250) {
    suspicionScore += 0.3;
  }

  // Check for conjunctions that might indicate combined facts
  const turkishConjunctions = [
    ' ve ',
    ' veya ',
    ' da ',
    ' de ',
    ' bir de ',
    ' ayrıca ',
    ' bunun yanında ',
  ];
  const conjunctionCount = turkishConjunctions.filter((conj) =>
    fact.toLowerCase().includes(conj),
  ).length;
  if (conjunctionCount > 0) {
    suspicionScore += Math.min(0.3, conjunctionCount * 0.15);
  }

  // Check for list markers
  const hasListMarkers = /^[\s]*[-•*]|^\s*\d+\./m.test(fact);
  if (hasListMarkers) {
    suspicionScore += 0.35;
  }

  // Normalize score to 0-1
  return Math.min(1, suspicionScore);
}
