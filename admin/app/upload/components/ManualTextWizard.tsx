'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

const contentTypeSchema = z.object({
  contentType: z.enum([
    'TOPIC_EXPLANATION',
    'SPOT_FACT',
    'QUESTION_ONLY',
    'QUESTION_WITH_ANSWER',
    'EXPLANATION_ONLY',
    'MIXED_CONTENT',
  ]),
});

const textContentSchema = z.object({
  textContent: z.string().min(50, 'Text content must be at least 50 characters'),
});

const summarySchema = z.object({
  topicId: z.string().uuid('Invalid topic selection'),
  description: z.string().optional(),
});

type ContentTypeFormData = z.infer<typeof contentTypeSchema>;
type TextContentFormData = z.infer<typeof textContentSchema>;
type SummaryFormData = z.infer<typeof summarySchema>;

interface ManualTextWizardProps {
  onCancel: () => void;
}

export default function ManualTextWizard({ onCancel }: ManualTextWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [wizardData, setWizardData] = useState<{
    contentType?: string;
    textContent?: string;
    topicId?: string;
    description?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topics, setTopics] = useState<Array<{ id: string; name: string; displayName: string | null; lessonId: string }>>([]);
  const [lessons, setLessons] = useState<Array<{ id: string; name: string; displayName: string | null }>>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await api.getTopics();
        if (response.success) {
          setTopics(response.topics || []);
          setLessons(response.lessons || []);
        }
      } catch (err) {
        console.error('Failed to fetch topics:', err);
      } finally {
        setLoadingTopics(false);
      }
    };
    fetchTopics();
  }, []);

  const contentTypeForm = useForm<ContentTypeFormData>({
    resolver: zodResolver(contentTypeSchema),
  });

  const textContentForm = useForm<TextContentFormData>({
    resolver: zodResolver(textContentSchema),
  });

  const summaryForm = useForm<SummaryFormData>({
    resolver: zodResolver(summarySchema),
  });

  const onContentTypeSubmit = (data: ContentTypeFormData) => {
    setWizardData((prev) => ({ ...prev, contentType: data.contentType }));
    setStep(2);
  };

  const onTextContentSubmit = (data: TextContentFormData) => {
    setWizardData((prev) => ({ ...prev, textContent: data.textContent }));
    setStep(3);
  };

  const onSummarySubmit = async (data: SummaryFormData) => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await api.createManualContent({
        topicId: data.topicId,
        description: data.description,
        contentType: wizardData.contentType!,
        textContent: wizardData.textContent!,
      });

      if (response.success) {
        router.push(`/batches/${response.batchId}`);
      } else {
        setError('Failed to create manual content');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create manual content');
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onCancel();
    }
  };

  const contentTypeLabels: Record<string, string> = {
    TOPIC_EXPLANATION: 'Topic Explanation',
    SPOT_FACT: 'Spot Fact',
    QUESTION_ONLY: 'Question Only',
    QUESTION_WITH_ANSWER: 'Question with Answer',
    EXPLANATION_ONLY: 'Explanation Only',
    MIXED_CONTENT: 'Mixed Content',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Step Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
                  }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${step > s ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>Content Type</span>
          <span>Text Input</span>
          <span>Summary</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Step 1: Content Type */}
      {step === 1 && (
        <form onSubmit={contentTypeForm.handleSubmit(onContentTypeSubmit)} className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Step 1: Select Content Type</h2>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Content Type *
            </label>
            <select
              {...contentTypeForm.register('contentType')}
              className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select content type...</option>
              <option value="TOPIC_EXPLANATION">Topic Explanation</option>
              <option value="SPOT_FACT">Spot Fact</option>
              <option value="QUESTION_ONLY">Question Only</option>
              <option value="QUESTION_WITH_ANSWER">Question with Answer</option>
              <option value="EXPLANATION_ONLY">Explanation Only</option>
              <option value="MIXED_CONTENT">Mixed Content</option>
            </select>
            {contentTypeForm.formState.errors.contentType && (
              <p className="mt-1 text-sm text-red-600">
                {contentTypeForm.formState.errors.contentType.message}
              </p>
            )}
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!contentTypeForm.formState.isValid}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Text Input */}
      {step === 2 && (
        <form onSubmit={textContentForm.handleSubmit(onTextContentSubmit)} className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Step 2: Enter Text Content</h2>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Medical Content *
            </label>
            <textarea
              {...textContentForm.register('textContent')}
              rows={15}
              className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Tıbbi içeriği buraya yapıştırın...&#10;&#10;Örnek:&#10;- Bullet points&#10;- Line breaks&#10;- Tables (as text)&#10;- Any medical content"
            />
            <p className="mt-1 text-xs text-gray-600">
              Minimum 50 characters required. Supports bullet points, line breaks, and tables pasted as text.
            </p>
            {textContentForm.formState.errors.textContent && (
              <p className="mt-1 text-sm text-red-600">
                {textContentForm.formState.errors.textContent.message}
              </p>
            )}
            <p className="mt-2 text-sm text-gray-600">
              Character count: {textContentForm.watch('textContent')?.length || 0}
            </p>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={goBack}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!textContentForm.formState.isValid}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Summary */}
      {step === 3 && (
        <form onSubmit={summaryForm.handleSubmit(onSummarySubmit)} className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Step 3: Review & Submit</h2>

            <div className="mb-4 p-4 bg-gray-50 rounded-md">
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Topic *
                </label>
                {loadingTopics ? (
                  <div className="text-sm text-gray-500">Loading topics...</div>
                ) : (
                  <select
                    {...summaryForm.register('topicId')}
                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a topic</option>
                    {topics.map((topic) => {
                      const lesson = lessons.find((l) => l.id === topic.lessonId);
                      const lessonName = lesson?.displayName || lesson?.name || 'Unknown';
                      return (
                        <option key={topic.id} value={topic.id}>
                          {topic.displayName || topic.name} ({lessonName})
                        </option>
                      );
                    })}
                  </select>
                )}
                {summaryForm.formState.errors.topicId && (
                  <p className="mt-1 text-sm text-red-600">
                    {summaryForm.formState.errors.topicId.message}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Text Content Preview
                </label>
                <div className="max-h-40 overflow-y-auto p-3 bg-white border border-gray-200 rounded text-sm text-gray-700 whitespace-pre-wrap">
                  {wizardData.textContent || 'No content'}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  {...summaryForm.register('description')}
                  rows={3}
                  className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of this batch..."
                />
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:bg-gray-300"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting || !summaryForm.formState.isValid}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div >
  );
}
