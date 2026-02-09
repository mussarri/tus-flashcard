'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { CheckCircle, XCircle, Save, AlertTriangle, Eye } from 'lucide-react';

interface ParsedBlock {
  id: string;
  rawText: string | null;
  editedText: string | null;
  lesson: string | null;
  topic: string | null;
  subtopic: string | null;
  contentType: string;
  confidence: number | null;
  approvalStatus: string;
  page: {
    id: string;
    pageNumber: number;
    originalName: string;
  };
}

export default function ContentReviewPage() {
  const [blocks, setBlocks] = useState<ParsedBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // TODO: Implement API endpoint to fetch blocks awaiting approval
    // For now, using placeholder
    setLoading(false);
  }, []);

  const handleStartEdit = (block: ParsedBlock) => {
    setEditingBlockId(block.id);
    setEditText(block.editedText || block.rawText || '');
  };

  const handleSaveEdit = async (blockId: string) => {
    setSaving(true);
    try {
      // Save edited text (don't approve yet)
      // TODO: Implement API endpoint for saving edits
      setEditingBlockId(null);
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save edit');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (blockId: string, text: string) => {
    if (!text.trim()) {
      alert('Cannot approve empty content. Please add text first.');
      return;
    }

    if (!confirm('Approve this content for knowledge extraction?')) {
      return;
    }

    try {
      await api.approveBlock(blockId, { editedText: text });
      // Refresh list
      window.location.reload();
    } catch (error) {
      console.error('Failed to approve block:', error);
      alert('Failed to approve block');
    }
  };

  const handleReject = async (blockId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await api.rejectBlock(blockId);
      // Refresh list
      window.location.reload();
    } catch (error) {
      console.error('Failed to reject block:', error);
      alert('Failed to reject block');
    }
  };

  const CONFIDENCE_THRESHOLD = 0.7;

  if (loading) {
    return (

      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>

    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Content Review</h1>
        <p className="text-gray-600 mt-2">
          Review and approve parsed blocks. AI suggestions are shown for reference only.
        </p>
      </div>

      {blocks.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No blocks awaiting review.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {blocks.map((block) => {
            const isEditing = editingBlockId === block.id;
            const displayText = isEditing ? editText : block.editedText || block.rawText || '';
            const lowConfidence = block.confidence !== null && block.confidence < CONFIDENCE_THRESHOLD;

            return (
              <div
                key={block.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Page {block.page.pageNumber}: {block.page.originalName}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>
                          <strong>Lesson:</strong> {block.lesson || 'N/A'} (AI suggestion)
                        </span>
                        <span>
                          <strong>Topic:</strong> {block.topic || 'N/A'} (AI suggestion)
                        </span>
                        <span>
                          <strong>Type:</strong> {block.contentType}
                        </span>
                        {block.confidence !== null && (
                          <span
                            className={
                              lowConfidence
                                ? 'text-red-600 font-semibold'
                                : 'text-gray-600'
                            }
                          >
                            <strong>Confidence:</strong> {(block.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    {lowConfidence && (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="text-sm font-medium">Low Confidence</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="grid grid-cols-2 gap-6 p-6">
                  {/* Left: Raw Text (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Raw Text (OCR Output)
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded p-4 h-64 overflow-y-auto">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {block.rawText || 'No raw text available'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Editable Text */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Edited Text (Final Content)
                    </label>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full h-64 p-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Edit the content here..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(block.id)}
                            disabled={saving || !editText.trim()}
                            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Save Edit
                          </button>
                          <button
                            onClick={() => {
                              setEditingBlockId(null);
                              setEditText('');
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="bg-white border border-gray-200 rounded p-4 h-64 overflow-y-auto">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {displayText || 'No content'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleStartEdit(block)}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    onClick={() => handleReject(block.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(block.id, displayText)}
                    disabled={!displayText.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                    title={
                      !displayText.trim()
                        ? 'Cannot approve empty content. Please add text first.'
                        : 'Approve this content for knowledge extraction'
                    }
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
