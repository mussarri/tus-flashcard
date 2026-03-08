'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DedupPolicy = 'REJECT_IF_DUPLICATE' | 'ALLOW_DUPLICATE';
type ContentTypeHint =
  | 'TOPIC_EXPLANATION'
  | 'SPOT_FACT'
  | 'QUESTION_ONLY'
  | 'QUESTION_WITH_ANSWER'
  | 'EXPLANATION_ONLY'
  | 'MIXED_CONTENT';

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

export default function NewManualBatchPage() {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [contentTypeHint, setContentTypeHint] = useState<ContentTypeHint>('MIXED_CONTENT');
  const [dedupPolicy, setDedupPolicy] = useState<DedupPolicy>('REJECT_IF_DUPLICATE');
  const [rawText, setRawText] = useState('');

  // UI state
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
          <strong>UploadBatch → UploadPage(TEXT) → ParsedBlocks</strong> pipeline. Text is stored as a{' '}
          <strong>single raw block</strong>, then reviewed and sent directly to knowledge extraction AI. The block will be{' '}
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

        {/* Content type */}
        <div className="grid grid-cols-1 gap-4">
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
                Creating Manual Batch…
              </>
            ) : (
              'Create Manual Batch'
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
