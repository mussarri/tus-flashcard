'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import ManualTextWizard from './components/ManualTextWizard';

const batchSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  description: z.string().optional(),
  visionProvider: z.enum(['OPENAI', 'GEMINI']).optional(),
  contentTypeHint: z.enum([
    'TOPIC_EXPLANATION',
    'SPOT_FACT',
    'QUESTION_ONLY',
    'QUESTION_WITH_ANSWER',
    'EXPLANATION_ONLY',
    'MIXED_CONTENT',
  ]),
});

type BatchFormData = z.infer<typeof batchSchema>;

type ContentSource = 'IMAGE_OR_PDF' | 'MANUAL_TEXT' | null;

export default function UploadPage() {
  const router = useRouter();
  const [contentSource, setContentSource] = useState<ContentSource>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles) => {
      setFiles((prev) => [...prev, ...acceptedFiles]);
      setError(null);
    },
  });

  const onCreateBatch = async (data: BatchFormData) => {
    try {
      setError(null);
      const response = await api.createBatch(data);
      if (response.success) {
        setBatchId(response.batch.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create batch');
    }
  };

  const onUploadFiles = async () => {
    if (!batchId || files.length === 0) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await api.uploadFiles(batchId, formData);

      if (response.success) {
        router.push(`/batches/${batchId}`);
      } else {
        setError('Failed to upload files');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Upload Content</h1>

        {/* Step 0: Content Source Selection */}
        {!contentSource && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Content Source</h2>
            <p className="text-gray-600 mb-6">
              Choose how you want to add content to the system.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setContentSource('IMAGE_OR_PDF')}
                className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Image or PDF Upload</h3>
                <p className="text-sm text-gray-600">
                  Upload images or PDFs. Content will be processed through OCR and AI classification.
                </p>
              </button>
              <button
                onClick={() => setContentSource('MANUAL_TEXT')}
                className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Manual Text Input</h3>
                <p className="text-sm text-gray-600">
                  Enter content directly as text. Bypasses OCR and goes straight to review.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Manual Text Wizard */}
        {contentSource === 'MANUAL_TEXT' && (
          <ManualTextWizard onCancel={() => setContentSource(null)} />
        )}

        {/* Image/PDF Upload Flow */}
        {contentSource === 'IMAGE_OR_PDF' && !batchId && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Batch</h2>
            <form onSubmit={handleSubmit(onCreateBatch)} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Topic *
                </label>
                <input
                  {...register('topic')}
                  type="text"
                  className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Cardiology - Arrhythmias"
                />
                {errors.topic && (
                  <p className="mt-1 text-sm text-red-600">{errors.topic.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of this batch..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Content Type *
                </label>
                <select
                  {...register('contentTypeHint')}
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
                {errors.contentTypeHint && (
                  <p className="mt-1 text-sm text-red-600">{errors.contentTypeHint.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Vision Provider (Optional)
                </label>
                <select
                  {...register('visionProvider')}
                  className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Default (from config)</option>
                  <option value="OPENAI">OpenAI</option>
                  <option value="GEMINI">Gemini</option>
                </select>
                <p className="mt-1 text-xs text-gray-700">
                  AI provider to use for vision processing (OCR and classification)
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Create Batch
              </button>
            </form>
          </div>
        )}

        {contentSource === 'IMAGE_OR_PDF' && batchId && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Upload Files</h2>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <p className="text-gray-800 font-medium">
                  {isDragActive
                    ? 'Drop files here...'
                    : 'Drag & drop files here, or click to select'}
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  Supports: JPG, PNG, PDF (max 10MB per file)
                </p>
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h3 className="font-semibold text-gray-900">Selected Files:</h3>
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span className="text-sm font-medium text-gray-900">{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                onClick={onUploadFiles}
                disabled={files.length === 0 || uploading}
                className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {uploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
              </button>
            </div>
          </div>
        )}

        {/* Back button for image upload flow */}
        {contentSource === 'IMAGE_OR_PDF' && (
          <div className="mt-4">
            <button
              onClick={() => {
                setContentSource(null);
                setBatchId(null);
                setFiles([]);
                setError(null);
              }}
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              ← Back to source selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
