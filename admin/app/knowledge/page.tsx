/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { Brain, Play, AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface ApprovedContent {
  id: string;
  content: string;
  extractionStatus: string;
  extractedAt: string | null;
  block: {
    lesson: string | null;
    topic: string | null;
  };
}

export default function KnowledgePage() {
  const [approvedContent, setApprovedContent] = useState<ApprovedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState<string | null>(null);

  useEffect(() => {
    const fetchApproved = async () => {
      try {
        setLoading(true);
        const res = await api.getApprovedContents("limit=200");
        if (res && res.success) {
          // API returns `approvedContents` array
          setApprovedContent(res.approvedContents || []);
        } else {
          setApprovedContent([]);
        }
      } catch (error) {
        console.error("Failed to load approved content:", error);
        setApprovedContent([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApproved();
  }, []);

  const handleExtract = async (contentId: string) => {
    if (
      !confirm(
        "This action will generate Knowledge Points. This cannot be undone. Continue?",
      )
    ) {
      return;
    }

    setExtracting(contentId);
    try {
      await api.extractKnowledgeForContent(contentId);
      // Refresh list
      window.location.reload();
    } catch (error: any) {
      console.error("Failed to extract knowledge:", error);
      alert(error.message || "Failed to extract knowledge");
    } finally {
      setExtracting(null);
    }
  };

  const canExtract = (status: string) => {
    return status === "NOT_STARTED" || status === "VERIFIED";
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      NOT_STARTED: { color: "bg-gray-100 text-gray-800", label: "Not Started" },
      QUEUED: { color: "bg-blue-100 text-blue-800", label: "Queued" },
      PROCESSING: {
        color: "bg-yellow-100 text-yellow-800",
        label: "Processing",
      },
      COMPLETED: { color: "bg-green-100 text-green-800", label: "Completed" },
      VERIFIED: { color: "bg-purple-100 text-purple-800", label: "Verified" },
      FAILED: { color: "bg-red-100 text-red-800", label: "Failed" },
    };

    const c = config[status] || {
      color: "bg-gray-100 text-gray-800",
      label: status,
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${c.color}`}>
        {c.label}
      </span>
    );
  };

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

  const pendingContent = approvedContent.filter((ac) =>
    canExtract(ac.extractionStatus),
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Knowledge Extraction
        </h1>
        <p className="text-gray-600 mt-2">
          Trigger knowledge extraction for approved content. This is step 3 of
          the pipeline.
        </p>
      </div>

      {pendingContent.length === 0 && approvedContent.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800">
              All approved content has been processed for knowledge extraction.
            </p>
          </div>
        </div>
      )}

      {approvedContent.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No approved content found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvedContent.map((content) => {
            const canTrigger = canExtract(content.extractionStatus);
            const isExtracting = extracting === content.id;

            return (
              <div
                key={content.id}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Brain className="w-5 h-5 text-gray-400" />
                      <h3 className="font-semibold text-gray-900">
                        Content ID: {content.id.substring(0, 8)}
                      </h3>
                      {getStatusBadge(content.extractionStatus)}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <span>
                        <strong>Lesson:</strong> {content.block.lesson || "N/A"}
                      </span>
                      {" • "}
                      <span>
                        <strong>Topic:</strong> {content.block.topic || "N/A"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {content.content.substring(0, 300)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  {!canTrigger && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        {content.extractionStatus === "COMPLETED" ||
                        content.extractionStatus === "VERIFIED"
                          ? "Already processed. Reset to NOT_STARTED to reprocess."
                          : `Status: ${content.extractionStatus}`}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => handleExtract(content.id)}
                    disabled={!canTrigger || isExtracting}
                    className={`
                        px-4 py-2 rounded flex items-center gap-2
                        ${
                          canTrigger
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }
                      `}
                    title={
                      !canTrigger
                        ? "Cannot extract: Content already processed or invalid status"
                        : "Extract knowledge points from this content"
                    }
                  >
                    {isExtracting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Extract Knowledge
                      </>
                    )}
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
