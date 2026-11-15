/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { api, apiRequest } from "../../../lib/api";
import { useRouter } from "next/navigation";
import {
  Brain,
  FileText,
  AlertCircle,
  Info,
  BookOpen,
  Tag,
  TrendingUp,
} from "lucide-react";

interface ParsedBlock {
  id: string;
  rawText: string | null;
  editedText: string | null;
  approvalStatus: string;
  lesson: string | null;
  topic: string | null;
  subtopic: string | null;
  contentType: string;
  confidence: number | null;
  classificationStatus: string;
  classifiedAt: string | null;
  blockType: string | null;
  tableData?: unknown;
  algorithmData?: unknown;
  page: {
    id: string;
    pageNumber: number;
    originalName: string;
  };
}

interface ClassificationViewProps {
  batchId: string;
}

export default function ClassificationView({
  batchId,
}: ClassificationViewProps) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<ParsedBlock[]>([]);
  const [batchSourceType, setBatchSourceType] = useState<string>("FILE_UPLOAD");
  const [loading, setLoading] = useState(true);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [draftType, setDraftType] = useState<"TEXT" | "TABLE" | "ALGORITHM">("TEXT");
  const [draftContent, setDraftContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const startEdit = (block: ParsedBlock) => {
    setEditingBlockId(block.id);
    setDraftType((block.blockType || "TEXT") as "TEXT" | "TABLE" | "ALGORITHM");
    setDraftContent(block.editedText || block.rawText || "");
    setActionError(null);
  };

  const saveSuggestion = async (blockId: string) => {
    setSaving(true);
    setActionError(null);
    try {
      const response = await apiRequest<{ block: ParsedBlock }>(
        `api/approval/block/${blockId}/manual-suggestion`,
        { method: "PATCH", body: JSON.stringify({ blockType: draftType, content: draftContent }) },
      );
      setBlocks((previous) => previous.map((block) =>
        block.id === blockId ? { ...block, ...response.block } : block,
      ));
      setEditingBlockId(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not save block");
    } finally {
      setSaving(false);
    }
  };

  const approveSuggestion = async (blockId: string) => {
    setSaving(true);
    setActionError(null);
    try {
      await api.approveBlock(blockId);
      setBlocks((previous) => previous.map((block) =>
        block.id === blockId ? { ...block, approvalStatus: "APPROVED" } : block,
      ));
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not approve block");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const response = await api.getBatchForReview(batchId);
        if (response.success && response.batch) {
          setBatchSourceType(response.batch.sourceType || "FILE_UPLOAD");
          const allBlocks: ParsedBlock[] = [];
          response.batch.pages?.forEach((page: any) => {
            page.blocks?.forEach((block: any) => {
              allBlocks.push({
                ...block,
                page: {
                  id: page.id,
                  pageNumber: page.pageNumber,
                  originalName: page.originalName,
                },
              });
            });
          });
          setBlocks(allBlocks);
        }
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch blocks:", error);
        setLoading(false);
      }
    };

    fetchBlocks();
  }, [batchId]);

  const getContentTypeBadge = (type: string) => {
    const config: Record<string, { color: string; label: string }> = {
      TOPIC_EXPLANATION: {
        color: "bg-blue-100 text-blue-800",
        label: "Topic Explanation",
      },
      SPOT_FACT: { color: "bg-green-100 text-green-800", label: "Spot Fact" },
      QUESTION_ONLY: {
        color: "bg-purple-100 text-purple-800",
        label: "Question Only",
      },
      QUESTION_WITH_ANSWER: {
        color: "bg-indigo-100 text-indigo-800",
        label: "Question + Answer",
      },
      EXPLANATION_ONLY: {
        color: "bg-yellow-100 text-yellow-800",
        label: "Explanation Only",
      },
      MIXED_CONTENT: {
        color: "bg-gray-100 text-gray-800",
        label: "Mixed Content",
      },
    };

    const c = config[type] || {
      color: "bg-gray-100 text-gray-800",
      label: type,
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${c.color}`}>
        {c.label}
      </span>
    );
  };

  const getConfidenceBadge = (confidence: number | null) => {
    if (confidence === null) return null;

    const percentage = Math.round(confidence * 100);
    let color = "bg-green-100 text-green-800";
    if (percentage < 50) color = "bg-red-100 text-red-800";
    else if (percentage < 70) color = "bg-yellow-100 text-yellow-800";

    return (
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        <span className={`px-2 py-1 text-xs font-semibold rounded ${color}`}>
          {percentage}% confidence
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const isManualTextBatch = batchSourceType === "MANUAL_TEXT";

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                AI Classification
              </p>
              <p className="text-sm text-blue-700">
                Review the suggested type and formatted content before approval.
              </p>
              {isManualTextBatch && (
                <p className="text-sm text-blue-700 mt-1">
                  The original pasted text is available in the Pages tab. Each section separated by --- is saved as its own block.
                </p>
              )}
            </div>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Parsed Blocks Classification
        </h2>
      </div>

      {blocks.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No parsed blocks found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {blocks.map((block) => {
            const isExpanded = expandedBlockId === block.id;

            return (
              <div
                key={block.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Header */}
                <div
                  className="bg-gray-50 px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() =>
                    setExpandedBlockId(isExpanded ? null : block.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Page {block.page.pageNumber}:{" "}
                          {block.page.originalName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Block ID: {block.id.substring(0, 8)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getContentTypeBadge(block.contentType)}
                      {getConfidenceBadge(block.confidence)}
                      <span className="text-gray-400">
                        {isExpanded ? "▼" : "▶"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-6 space-y-6">
                    {/* AI Classification */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        AI Classification (Suggestion Only)
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 border border-gray-200 rounded p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-medium text-gray-500">
                              Lesson
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {block.lesson || (
                              <span className="text-gray-400 italic">
                                Not classified
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Tag className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-medium text-gray-500">
                              Topic
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {block.topic || (
                              <span className="text-gray-400 italic">
                                Not classified
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Tag className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-medium text-gray-500">
                              Subtopic
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {block.subtopic || (
                              <span className="text-gray-400 italic">
                                Not classified
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Suggested formatted text */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        {isManualTextBatch
                          ? "AI-formatted content"
                          : "Raw Text (OCR Output)"}
                      </h4>
                      {editingBlockId === block.id ? (
                        <div className="space-y-3">
                          <select value={draftType} onChange={(event) => setDraftType(event.target.value as typeof draftType)} className="border rounded p-2 text-gray-900">
                            <option value="TEXT">TEXT</option>
                            <option value="TABLE">TABLE</option>
                            <option value="ALGORITHM">ALGORITHM</option>
                          </select>
                          <textarea value={draftContent} onChange={(event) => setDraftContent(event.target.value)} rows={12} className="w-full border rounded p-3 text-gray-900" />
                          <div className="flex gap-2">
                            <button disabled={saving || !draftContent.trim()} onClick={() => void saveSuggestion(block.id)} className="px-3 py-2 bg-blue-700 text-white rounded disabled:opacity-50">Save</button>
                            <button disabled={saving} onClick={() => setEditingBlockId(null)} className="px-3 py-2 border rounded">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded p-4 max-h-64 overflow-y-auto">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{block.editedText || block.rawText || "No content available"}</p>
                        </div>
                      )}
                      {isManualTextBatch && block.approvalStatus === "PENDING" && editingBlockId !== block.id && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => startEdit(block)} className="px-3 py-2 border rounded">Edit type and content</button>
                          <button disabled={saving} onClick={() => void approveSuggestion(block.id)} className="px-3 py-2 bg-green-700 text-white rounded disabled:opacity-50">Approve block</button>
                        </div>
                      )}
                      {isManualTextBatch && block.blockType === "TABLE" && block.tableData != null && (
                        <details className="mt-3 text-sm text-gray-700">
                          <summary className="cursor-pointer">View structured table</summary>
                          <pre className="mt-2 p-3 bg-gray-50 rounded whitespace-pre-wrap overflow-x-auto">{JSON.stringify(block.tableData, null, 2)}</pre>
                        </details>
                      )}
                      {isManualTextBatch && block.blockType === "ALGORITHM" && block.algorithmData != null && (
                        <details className="mt-3 text-sm text-gray-700">
                          <summary className="cursor-pointer">View structured algorithm</summary>
                          <pre className="mt-2 p-3 bg-gray-50 rounded whitespace-pre-wrap overflow-x-auto">{JSON.stringify(block.algorithmData, null, 2)}</pre>
                        </details>
                      )}
                      {actionError && expandedBlockId === block.id && <p className="mt-2 text-sm text-red-700">{actionError}</p>}
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">
                          Block Type:
                        </span>{" "}
                        <span className="text-gray-900">
                          {block.blockType || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Classification Status:
                        </span>{" "}
                        <span className="text-gray-900">
                          {block.classificationStatus}
                        </span>
                      </div>
                      {block.classifiedAt && (
                        <div>
                          <span className="font-medium text-gray-700">
                            Classified At:
                          </span>{" "}
                          <span className="text-gray-900">
                            {new Date(block.classifiedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Warning */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-900 mb-1">
                            This is an AI suggestion
                          </p>
                          <p className="text-sm text-yellow-700">
                            Check the suggested type, structured content, and original pasted text before approval.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
