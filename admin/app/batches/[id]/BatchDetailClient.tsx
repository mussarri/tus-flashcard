/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import ClassificationView from "./ClassificationView";
import { apiRequest } from "@/lib/api";
import {
  FileText,
  CheckCircle,
  Brain,
  CreditCard,
  HelpCircle,
  Activity,
  Lock,
} from "lucide-react";

const API_RUN = "admin/knowledge-extraction/run";
const API_RUN_BATCH = "admin/knowledge-extraction/run-batch";
const API_STATUS = "admin/knowledge-extraction/status";

type ExtractionMode = "APPEND" | "REPLACE";

type StatusCounts = {
  NOT_STARTED: number;
  QUEUED: number;
  PROCESSING: number;
  COMPLETED: number;
  FAILED: number;
};

type ExtractionItemStatus = {
  approvedContentId: string;
  extractionStatus: string;
  lastError?: string;
  kpCount?: number;
};

interface Batch {
  id: string;
  topic: string;
  description?: string;
  status: string;
  sourceType?: string;
  pages: Array<{
    id: string;
    pageNumber: number;
    fileType?: string;
    rawText?: string;
    textHash?: string;
    blocks: any[];
  }>;
}

interface Tab {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  enabled: boolean;
  reason?: string;
}

interface BatchDetailClientProps {
  batch: Batch;
  approvedContent: any[];
  knowledgePoints: any[];
  flashcards: any[];
  questions: any[];
}

export default function BatchDetailClient({
  batch,
  approvedContent,
  knowledgePoints,
  flashcards,
  questions,
}: BatchDetailClientProps) {
  const [activeTab, setActiveTab] = useState("pages");
  const [statusCounts, setStatusCounts] = useState<StatusCounts | null>(null);
  const [itemStatusMap, setItemStatusMap] = useState<
    Record<string, ExtractionItemStatus>
  >({});
  const [bulkLoadingMode, setBulkLoadingMode] = useState<ExtractionMode | null>(
    null,
  );
  const [itemLoadingMap, setItemLoadingMap] = useState<Record<string, boolean>>(
    {},
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchExtractionStatus = useCallback(async () => {
    try {
      const data = await apiRequest<{
        counts?: Partial<StatusCounts>;
        items?: ExtractionItemStatus[];
      }>(
        `${API_STATUS}?batchId=${encodeURIComponent(batch.id)}`,
      );

      if (data?.counts) {
        setStatusCounts({
          NOT_STARTED: Number(data.counts.NOT_STARTED || 0),
          QUEUED: Number(data.counts.QUEUED || 0),
          PROCESSING: Number(data.counts.PROCESSING || 0),
          COMPLETED: Number(data.counts.COMPLETED || 0),
          FAILED: Number(data.counts.FAILED || 0),
        });
      }

      if (Array.isArray(data?.items)) {
        const nextMap: Record<string, ExtractionItemStatus> = {};
        for (const item of data.items) {
          if (item?.approvedContentId) {
            nextMap[item.approvedContentId] = {
              approvedContentId: item.approvedContentId,
              extractionStatus: item.extractionStatus || "NOT_STARTED",
              lastError: item.lastError,
              kpCount: item.kpCount,
            };
          }
        }
        setItemStatusMap(nextMap);
      }
    } catch {
      // Keep UI resilient; actions still work without status refresh.
    }
  }, [batch.id]);

  useEffect(() => {
    void fetchExtractionStatus();
  }, [fetchExtractionStatus]);

  const hasInFlight = useMemo(() => {
    if (statusCounts) {
      return statusCounts.QUEUED > 0 || statusCounts.PROCESSING > 0;
    }

    return Object.values(itemStatusMap).some(
      (item) =>
        item.extractionStatus === "QUEUED" ||
        item.extractionStatus === "PROCESSING",
    );
  }, [itemStatusMap, statusCounts]);

  useEffect(() => {
    if (!hasInFlight) {
      return;
    }

    const interval = setInterval(() => {
      void fetchExtractionStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchExtractionStatus, hasInFlight]);

  const runSingleExtraction = useCallback(
    async (approvedContentId: string, mode: ExtractionMode) => {
      setActionError(null);
      setActionSuccess(null);
      setItemLoadingMap((prev) => ({ ...prev, [approvedContentId]: true }));

      try {
        await apiRequest<{ jobId?: string; status: "QUEUED" }>(API_RUN, {
          method: "POST",
          body: JSON.stringify({ approvedContentId, mode }),
        });

        setActionSuccess(`Extraction queued (${mode}).`);
        await fetchExtractionStatus();
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "Extraction request failed unexpectedly.",
        );
      } finally {
        setItemLoadingMap((prev) => ({ ...prev, [approvedContentId]: false }));
      }
    },
    [fetchExtractionStatus],
  );

  const runBatchExtraction = useCallback(
    async (mode: ExtractionMode) => {
      setActionError(null);
      setActionSuccess(null);
      setBulkLoadingMode(mode);

      try {
        const data = await apiRequest<{ queuedCount: number }>(API_RUN_BATCH, {
          method: "POST",
          body: JSON.stringify({ batchId: batch.id, mode }),
        });
        setActionSuccess(
          `Batch extraction queued (${mode}). Items queued: ${Number(data?.queuedCount || 0)}.`,
        );
        await fetchExtractionStatus();
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "Batch extraction failed unexpectedly.",
        );
      } finally {
        setBulkLoadingMode(null);
      }
    },
    [batch.id, fetchExtractionStatus],
  );

  // Determine tab availability based on pipeline stage
  const getTabs = (): Tab[] => {
    const hasApprovedContent = approvedContent.length > 0;
    const hasFlashcards = flashcards.length > 0;

    return [
      {
        id: "pages",
        label: "Pages / Parsed Blocks",
        icon: FileText,
        enabled: true,
      },
      {
        id: "approved",
        label: "Approved Content",
        icon: CheckCircle,
        enabled: hasApprovedContent,
        reason: hasApprovedContent
          ? undefined
          : "No approved content yet. Approve blocks in the Pages tab first.",
      },
      {
        id: "knowledge",
        label: "Knowledge",
        icon: Brain,
        enabled: hasApprovedContent,
        reason: hasApprovedContent
          ? undefined
          : "No approved content yet. Approve blocks in the Pages tab first, then extract knowledge.",
      },
      {
        id: "flashcards",
        label: "Flashcards",
        icon: CreditCard,
        enabled: hasFlashcards,
        reason: hasFlashcards
          ? undefined
          : "No flashcards generated yet. Generate flashcards from topics page.",
      },
      {
        id: "questions",
        label: "Questions",
        icon: HelpCircle,
        enabled: questions.length > 0,
        reason:
          questions.length > 0
            ? undefined
            : "No questions generated yet. Generate questions from topics page.",
      },
      {
        id: "logs",
        label: "Logs",
        icon: Activity,
        enabled: true,
      },
    ];
  };

  const tabs = getTabs();

  const renderTabContent = () => {
    switch (activeTab) {
      case "pages":
        return <PagesTab batch={batch} />;
      case "approved":
        return (
          <ApprovedContentTab
            batch={batch}
            approvedContent={approvedContent}
            statusCounts={statusCounts}
            itemStatusMap={itemStatusMap}
            itemLoadingMap={itemLoadingMap}
            bulkLoadingMode={bulkLoadingMode}
            actionError={actionError}
            actionSuccess={actionSuccess}
            onRunSingle={runSingleExtraction}
            onRunBatch={runBatchExtraction}
          />
        );
      case "knowledge":
        return (
          <KnowledgeTab
            batch={batch}
            knowledgePoints={knowledgePoints}
            statusCounts={statusCounts}
            onGoApproved={() => setActiveTab("approved")}
          />
        );
      case "flashcards":
        return <FlashcardsTab flashcards={flashcards} />;
      case "questions":
        return <QuestionsTab questions={questions} />;
      case "logs":
        return <LogsTab batchId={batch.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{batch.topic}</h1>
        {batch.description && (
          <p className="text-gray-600 mt-2">{batch.description}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded">
            {batch.status}
          </span>
          {batch.sourceType === "MANUAL_TEXT" && (
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded">
              MANUAL TEXT
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => tab.enabled && setActiveTab(tab.id)}
                disabled={!tab.enabled}
                className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      !tab.enabled
                        ? "text-gray-400 cursor-not-allowed border-transparent"
                        : isActive
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                title={tab.reason}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
                {!tab.enabled && <Lock className="w-4 h-4" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>{renderTabContent()}</div>
    </div>
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case "QUEUED":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "PROCESSING":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "COMPLETED":
    case "VERIFIED":
      return "bg-green-100 text-green-800 border-green-200";
    case "FAILED":
      return "bg-red-100 text-red-800 border-red-200";
    case "NOT_STARTED":
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded border ${getStatusStyle(status)}`}
    >
      {status}
    </span>
  );
}

// Tab Components
function PagesTab({ batch }: { batch: Batch }) {
  const isManualText = (batch as any).sourceType === "MANUAL_TEXT";

  return (
    <div>
      {isManualText && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 shrink-0 mt-0.5">
            MANUAL TEXT
          </span>
          <div>
            <p className="text-sm font-medium text-green-900">
              This batch was created from pasted text.
            </p>
            <p className="text-sm text-green-700 mt-0.5">
              No OCR was performed. The pasted text was stored as a single raw
              block and is ready for review.
            </p>
            {batch.pages?.[0]?.rawText && (
              <details className="mt-3">
                <summary className="text-xs font-medium text-green-800 cursor-pointer hover:underline">
                  View original pasted text
                </summary>
                <pre className="mt-2 text-xs text-green-900 bg-green-100 rounded p-3 whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
                  {batch.pages[0].rawText}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
      <ClassificationView batchId={batch.id} />
    </div>
  );
}

function ApprovedContentTab({
  batch,
  approvedContent,
  statusCounts,
  itemStatusMap,
  itemLoadingMap,
  bulkLoadingMode,
  actionError,
  actionSuccess,
  onRunSingle,
  onRunBatch,
}: {
  batch: Batch;
  approvedContent: any[];
  statusCounts: StatusCounts | null;
  itemStatusMap: Record<string, ExtractionItemStatus>;
  itemLoadingMap: Record<string, boolean>;
  bulkLoadingMode: ExtractionMode | null;
  actionError: string | null;
  actionSuccess: string | null;
  onRunSingle: (
    approvedContentId: string,
    mode: ExtractionMode,
  ) => Promise<void>;
  onRunBatch: (mode: ExtractionMode) => Promise<void>;
}) {
  const getItemStatus = (content: any) => {
    return (
      itemStatusMap[content.id]?.extractionStatus ||
      content.extractionStatus ||
      "NOT_STARTED"
    );
  };

  const getItemError = (content: any) => {
    return itemStatusMap[content.id]?.lastError || content.lastError;
  };

  return (
    <div>
      <p className="text-gray-600 mb-4">
        Content approved for knowledge extraction. This is step 2 of the
        pipeline.
      </p>

      {approvedContent.length > 0 && (
        <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-900 mr-2">
                Batch actions
              </span>
              {statusCounts && (
                <span>
                  NOT_STARTED: {statusCounts.NOT_STARTED} | QUEUED:{" "}
                  {statusCounts.QUEUED} | PROCESSING: {statusCounts.PROCESSING}{" "}
                  | COMPLETED: {statusCounts.COMPLETED} | FAILED:{" "}
                  {statusCounts.FAILED}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onRunBatch("APPEND")}
                disabled={bulkLoadingMode !== null}
                className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-60"
                title="Queue extraction for all approved items without replacing existing knowledge points."
                aria-label="Extract all approved content in append mode"
              >
                {bulkLoadingMode === "APPEND"
                  ? "Queueing..."
                  : "Extract All (APPEND)"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const confirmed = window.confirm(
                    "Re-run extraction for all approved content in REPLACE mode? This can overwrite existing extracted knowledge points.",
                  );
                  if (confirmed) {
                    void onRunBatch("REPLACE");
                  }
                }}
                disabled={bulkLoadingMode !== null}
                className="px-3 py-2 rounded-md bg-red-600 text-white text-sm font-medium disabled:opacity-60"
                title="Queue REPLACE extraction for all approved items. Existing extracted data may be overwritten."
                aria-label="Re-run extraction for all approved content in replace mode"
              >
                {bulkLoadingMode === "REPLACE"
                  ? "Queueing..."
                  : "Re-run All (REPLACE)"}
              </button>
            </div>
          </div>
          {actionError && (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {actionError}
            </p>
          )}
          {actionSuccess && (
            <p className="mt-3 text-sm text-green-700">{actionSuccess}</p>
          )}
        </div>
      )}

      {approvedContent.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No approved content yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvedContent.map((content) => {
            const status = getItemStatus(content);
            const lastError = getItemError(content);
            const isLoading = Boolean(itemLoadingMap[content.id]);

            return (
              <div
                key={content.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <StatusBadge status={status} />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void onRunSingle(content.id, "APPEND")}
                      disabled={isLoading}
                      className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium disabled:opacity-60"
                      title="Queue extraction for this content and append new knowledge points."
                      aria-label="Extract approved content in append mode"
                    >
                      {isLoading ? "Queueing..." : "Extract (APPEND)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const confirmed = window.confirm(
                          "Re-run extraction in REPLACE mode for this content? Existing extracted result may be overwritten.",
                        );
                        if (confirmed) {
                          void onRunSingle(content.id, "REPLACE");
                        }
                      }}
                      disabled={isLoading}
                      className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium disabled:opacity-60"
                      title="Queue REPLACE extraction for this content. Existing extracted data may be overwritten."
                      aria-label="Re-run extraction for this approved content in replace mode"
                    >
                      Re-run (REPLACE)
                    </button>
                    {status === "FAILED" && (
                      <button
                        type="button"
                        onClick={() => void onRunSingle(content.id, "APPEND")}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-md bg-amber-600 text-white text-xs font-medium disabled:opacity-60"
                        title="Retry failed extraction in APPEND mode."
                        aria-label="Retry failed extraction"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-900">
                  {content.content?.substring(0, 200)}...
                </p>

                {status === "FAILED" && lastError && (
                  <p className="mt-2 text-xs text-red-700">
                    Error: {lastError}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KnowledgeTab({
  batch,
  knowledgePoints,
  statusCounts,
  onGoApproved,
}: {
  batch: Batch;
  knowledgePoints: any[];
  statusCounts: StatusCounts | null;
  onGoApproved: () => void;
}) {
  return (
    <div>
      <p className="text-gray-600 mb-4">
        Knowledge points extracted from approved content. This is step 3 of the
        pipeline.
      </p>
      {knowledgePoints.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No knowledge points extracted yet.</p>
          {statusCounts && (
            <p className="text-xs text-gray-500 mt-2">
              NOT_STARTED: {statusCounts.NOT_STARTED} | QUEUED:{" "}
              {statusCounts.QUEUED} | PROCESSING: {statusCounts.PROCESSING} |
              COMPLETED: {statusCounts.COMPLETED} | FAILED:{" "}
              {statusCounts.FAILED}
            </p>
          )}
          <button
            type="button"
            onClick={onGoApproved}
            className="mt-4 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium"
            title="Open Approved Content tab to trigger extraction."
          >
            Go to Approved Content tab and click Extract
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {knowledgePoints.map((kp) => (
            <div
              key={kp.id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <p className="text-sm font-medium text-gray-900">{kp.fact}</p>
              {kp.category && (
                <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  {kp.category}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlashcardsTab({ flashcards }: { flashcards: any[] }) {
  return (
    <div>
      <p className="text-gray-600 mb-4">
        Flashcards generated from knowledge points.
      </p>
      {flashcards.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No flashcards generated yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flashcards.map((fc) => (
            <div
              key={fc.id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                  {fc.cardType}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900">{fc.front}</p>
              <p className="text-sm text-gray-600 mt-1">{fc.back}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionsTab({ questions }: { questions: any[] }) {
  return (
    <div>
      <p className="text-gray-600 mb-4">
        Questions generated from knowledge points.
      </p>
      {questions.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No questions generated yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div
              key={q.id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <p className="text-sm font-medium text-gray-900">{q.question}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LogsTab({ batchId }: { batchId: string }) {
  return (
    <div>
      <p className="text-gray-600 mb-4">Activity log for this batch.</p>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">Logs will be displayed here.</p>
      </div>
    </div>
  );
}
