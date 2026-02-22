'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SplitStrategy = 'LINES' | 'BULLETS' | 'PARAGRAPHS' | 'AUTO';
type DedupPolicy = 'REJECT_IF_DUPLICATE' | 'ALLOW_DUPLICATE';
type ContentTypeHint =
  | 'TOPIC_EXPLANATION'
  | 'SPOT_FACT'
  | 'QUESTION_ONLY'
  | 'QUESTION_WITH_ANSWER'
  | 'EXPLANATION_ONLY'
  | 'MIXED_CONTENT';

// ─────────────────────────────────────────────────────────────────────────────
// Client-side split preview (mirrors backend logic exactly)
// ─────────────────────────────────────────────────────────────────────────────

const BULLET_RE = /^\s*(?:[-*•]|(?:\d+[.)]\s)|(?:\d+-\s))/;

function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitByLines(text: string): string[] {
  return normalizeText(text)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function stripBulletMarker(line: string): string {
  return line.replace(/^\s*(?:[-*•]|\d+[.)]\s|\d+-\s)\s*/, '').trim();
}

function countBulletLines(lines: string[]): number {
  return lines.filter((l) => BULLET_RE.test(l)).length;
}

function splitByBullets(text: string): string[] {
  const lines = normalizeText(text).split('\n');
  if (countBulletLines(lines) === 0) return splitByLines(text);
  const chunks: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (BULLET_RE.test(line)) {
      if (current.length > 0) chunks.push(current.join(' ').trim());
      current = [stripBulletMarker(line)];
    } else {
      current.push(trimmed);
    }
  }
  if (current.length > 0) chunks.push(current.join(' ').trim());
  return chunks.filter((c) => c.length > 0);
}

function splitByParagraphs(text: string): string[] {
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

function splitAuto(text: string): string[] {
  const normalized = normalizeText(text);
  const lines = normalized.split('\n').filter((l) => l.trim().length > 0);
  const bulletRatio = lines.length > 0 ? countBulletLines(lines) / lines.length : 0;
  if (bulletRatio >= 0.3) return splitByBullets(text);
  if (/\n\n/.test(normalized)) return splitByParagraphs(text);
  return splitByLines(text);
}

function previewSplit(text: string, strategy: SplitStrategy): string[] {
  if (!text.trim()) return [];
  switch (strategy) {
    case 'LINES': return splitByLines(text);
    case 'BULLETS': return splitByBullets(text);
    case 'PARAGRAPHS': return splitByParagraphs(text);
    case 'AUTO': return splitAuto(text);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const CONTENT_TYPE_OPTIONS: Array<{ value: ContentTypeHint; label: string }> = [
  { value: 'TOPIC_EXPLANATION', label: 'Topic Explanation' },
  { value: 'SPOT_FACT', label: 'Spot Fact' },
  { value: 'QUESTION_ONLY', label: 'Question Only' },
  { value: 'QUESTION_WITH_ANSWER', label: 'Question + Answer' },
  { value: 'EXPLANATION_ONLY', label: 'Explanation Only' },
  { value: 'MIXED_CONTENT', label: 'Mixed Content' },
];

const SPLIT_STRATEGY_OPTIONS: Array<{ value: SplitStrategy; label: string; description: string }> = [
  { value: 'AUTO', label: 'Auto', description: 'Detect best strategy automatically' },
  { value: 'BULLETS', label: 'Bullets', description: 'Split on bullet markers and numbered lists' },
  { value: 'PARAGRAPHS', label: 'Paragraphs', description: 'Split on blank lines' },
  { value: 'LINES', label: 'Lines', description: 'Split on every newline' },
];

export default function NewManualBatchPage() {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [contentTypeHint, setContentTypeHint] = useState<ContentTypeHint>('MIXED_CONTENT');
  const [splitStrategy, setSplitStrategy] = useState<SplitStrategy>('AUTO');
  const [dedupPolicy, setDedupPolicy] = useState<DedupPolicy>('REJECT_IF_DUPLICATE');
  const [rawText, setRawText] = useState('');

  // UI state
  const [previewBlocks, setPreviewBlocks] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateBatchId, setDuplicateBatchId] = useState<string | null>(null);

  // Ontology data
  const [lessons, setLessons] = useState<Array<{ id: string; name: string; displayName: string }>>([]);
  const [topics, setTopics] = useState<Array<{ id: string; name: string; displayName: string; lessonId: string }>>([]);
  const [subtopics, setSubtopics] = useState<Array<{ id: string; name: string; displayName: string; topicId: string }>>([]);
  const [ontologyLoaded, setOntologyLoaded] = useState(false);
  const [ontologyLoading, setOntologyLoading] = useState(false);

  const loadOntology = useCallback(async () => {
    if (ontologyLoaded) return;
    setOntologyLoading(true);
    try {
      const res = await api.getTopics();
      setLessons(res.lessons || []);
      setTopics(res.topics || []);
      setSubtopics(res.subtopics || []);
      setOntologyLoaded(true);
    } catch (err) {
      console.error('Failed to load ontology', err);
    } finally {
      setOntologyLoading(false);
    }
  }, [ontologyLoaded]);

  const filteredTopics = topics.filter((t) => !lessonId || t.lessonId === lessonId);
  const filteredSubtopics = subtopics.filter((s) => !topicId || s.topicId === topicId);

  const handlePreview = () => {
    const blocks = previewSplit(rawText, splitStrategy);
    setPreviewBlocks(blocks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDuplicateBatchId(null);

    if (!title.trim()) { setError('Title is required.'); return; }
    if (!lessonId) { setError('Lesson is required.'); return; }
    if (!topicId) { setError('Topic is required.'); return; }
    if (!rawText.trim() || rawText.trim().length < 10) {
      setError('Raw text must be at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.createManualBatch({
        title: title.trim(),
        lessonId,
        topicId,
        subtopicId: subtopicId || undefined,
        contentTypeHint,
        rawText,
        splitStrategy,
        dedupPolicy,
      });

      if (result.success) {
        router.push(`/batches/${result.batchId}`);
      }
    } catch (err: unknown) {
      // 409: duplicate
      const anyErr = err as Record<string, unknown>;
      if (
        (typeof anyErr?.message === 'string' && anyErr.message.includes('409')) ||
        anyErr?.status === 409
      ) {
        const body = typeof anyErr?.response === 'object' ? (anyErr.response as Record<string, unknown>) : null;
        const existingId = typeof body?.existingBatchId === 'string' ? body.existingBatchId : null;
        setDuplicateBatchId(existingId);
        setError(
          `A batch with identical text already exists.${existingId ? ` Batch ID: ${existingId}` : ''}`,
        );
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create batch.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/batches" className="text-gray-500 hover:text-gray-700 text-sm">
          ← Back to Batches
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create Manual Text Batch</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          Paste raw text (anatomy notes, KP lists, topic explanations, etc.) to create an{' '}
          <strong>UploadBatch → UploadPage(TEXT) → ParsedBlocks</strong> pipeline. Blocks will be{' '}
          <strong>PENDING</strong> and require admin review before knowledge extraction.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
            {duplicateBatchId && (
              <Link
                href={`/batches/${duplicateBatchId}`}
                className="mt-2 inline-block text-sm text-red-700 underline hover:text-red-900"
              >
                View existing batch →
              </Link>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Batch Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Anatomy – Cardiovascular System Notes"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Ontology selectors */}
        <div className="grid grid-cols-3 gap-4">
          <div onClick={loadOntology}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lesson <span className="text-red-500">*</span>
            </label>
            <select
              value={lessonId}
              onChange={(e) => {
                setLessonId(e.target.value);
                setTopicId('');
                setSubtopicId('');
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">{ontologyLoading ? 'Loading…' : 'Select lesson'}</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>{l.displayName || l.name}</option>
              ))}
            </select>
          </div>

          <div onClick={loadOntology}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic <span className="text-red-500">*</span>
            </label>
            <select
              value={topicId}
              onChange={(e) => {
                setTopicId(e.target.value);
                setSubtopicId('');
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              required
              disabled={!lessonId}
            >
              <option value="">Select topic</option>
              {filteredTopics.map((t) => (
                <option key={t.id} value={t.id}>{t.displayName || t.name}</option>
              ))}
            </select>
          </div>

          <div onClick={loadOntology}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtopic</label>
            <select
              value={subtopicId}
              onChange={(e) => setSubtopicId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              disabled={!topicId}
            >
              <option value="">Optional</option>
              {filteredSubtopics.map((s) => (
                <option key={s.id} value={s.id}>{s.displayName || s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content type & split strategy */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content Type Hint</label>
            <select
              value={contentTypeHint}
              onChange={(e) => setContentTypeHint(e.target.value as ContentTypeHint)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              {CONTENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Split Strategy</label>
            <select
              value={splitStrategy}
              onChange={(e) => {
                setSplitStrategy(e.target.value as SplitStrategy);
                setPreviewBlocks(null);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              {SPLIT_STRATEGY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label} – {o.description}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dedup policy */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duplicate Policy</label>
          <div className="flex gap-6">
            {(['REJECT_IF_DUPLICATE', 'ALLOW_DUPLICATE'] as DedupPolicy[]).map((p) => (
              <label key={p} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="radio"
                  value={p}
                  checked={dedupPolicy === p}
                  onChange={() => setDedupPolicy(p)}
                  className="text-blue-600"
                />
                {p === 'REJECT_IF_DUPLICATE' ? 'Reject if duplicate (recommended)' : 'Allow duplicate'}
              </label>
            ))}
          </div>
        </div>

        {/* Raw text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Raw Text <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setPreviewBlocks(null);
            }}
            rows={14}
            placeholder={`Paste your notes here. Examples:\n\n- Diabetes mellitus type 2: insulin resistance\n- HbA1c > 6.5% for diagnosis\n- Metformin: first-line treatment\n\nOr paragraphs separated by blank lines.\nOr numbered lists like:\n1. First fact\n2. Second fact`}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 resize-y"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {rawText.length} characters · {rawText.split('\n').filter((l) => l.trim()).length} non-empty lines
          </p>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!rawText.trim()}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-200 disabled:opacity-50 border border-gray-300"
          >
            Preview Blocks
          </button>
          {previewBlocks !== null && (
            <span className="text-sm text-gray-600">
              {previewBlocks.length} block{previewBlocks.length !== 1 ? 's' : ''} detected
            </span>
          )}
        </div>

        {/* Preview list */}
        {previewBlocks !== null && previewBlocks.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Block Preview ({previewBlocks.length} blocks, strategy: {splitStrategy})
              </span>
            </div>
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {previewBlocks.map((block, i) => (
                <div key={i} className="px-4 py-2 flex gap-3">
                  <span className="text-xs text-gray-400 font-mono w-6 shrink-0 pt-0.5">{i + 1}</span>
                  <p className="text-sm text-gray-800">{block}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {previewBlocks !== null && previewBlocks.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              No blocks detected with this strategy. Try a different split strategy or add more content.
            </p>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating…
              </>
            ) : (
              'Create Batch'
            )}
          </button>
          <Link href="/batches" className="text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
