/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import {
  FileQuestion,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Upload,
  CheckSquare,
  Square,
  Zap,
  X,
  Loader2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface ExamQuestion {
  id: string;
  year: number;
  examType: string | null;
  questionNumber: number | null;
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string | null;
  lesson: { id: string; name: string } | null;
  topic: { id: string; name: string } | null;
  subtopic: { id: string; name: string } | null;
  traps: string[];
  analysisStatus:
    | "RAW"
    | "PENDING"
    | "PROCESSING"
    | "ANALYZED"
    | "NEEDS_REVIEW"
    | "REVIEWED"
    | "KNOWLEDGE_READY"
    | "CONTENT_READY"
    | "FAILED";
  analyzedAt: string | null;
  createdAt: string;
  _count: {
    knowledgePoints: number;
  };
  hasKnowledgePoints: boolean;
}

interface ExamQuestionsViewProps {
  initialData: {
    examQuestions: ExamQuestion[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export default function ExamQuestionsView({
  initialData,
}: ExamQuestionsViewProps) {
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>(
    initialData.examQuestions,
  );

  const [pagination, setPagination] = useState(initialData.pagination);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    year: "",
    examType: "",
    lesson: "",
    topic: "",
    analysisStatus: "",
    hasKnowledgePoints: "", // '' | 'true' | 'false'
    sortBy: "year" as "year" | "createdAt" | "updatedAt" | "questionNumber",
    sortOrder: "desc" as "asc" | "desc",
    createdAfter: "",
    createdBefore: "",
    updatedAfter: "",
    updatedBefore: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Bulk selection state
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set(),
  );
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkCreatingReplicas, setBulkCreatingReplicas] = useState(false);
  const [bulkGeneratingKPs, setBulkGeneratingKPs] = useState(false);
  const [showReplicaWarningModal, setShowReplicaWarningModal] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const loadExamQuestions = async (
    page: number = 1,
    limit: number = itemsPerPage,
  ) => {
    setLoading(true);
    try {
      const query: any = { page, limit };
      if (filters.year) query.year = parseInt(filters.year);
      if (filters.examType) query.examType = filters.examType;
      if (filters.lesson) query.lesson = filters.lesson;
      if (filters.topic) query.topic = filters.topic;
      if (filters.analysisStatus) query.analysisStatus = filters.analysisStatus;
      if (filters.hasKnowledgePoints)
        query.hasKnowledgePoints = filters.hasKnowledgePoints;
      if (filters.sortBy) query.sortBy = filters.sortBy;
      if (filters.sortOrder) query.sortOrder = filters.sortOrder;
      if (filters.createdAfter) query.createdAfter = filters.createdAfter;
      if (filters.createdBefore) query.createdBefore = filters.createdBefore;
      if (filters.updatedAfter) query.updatedAfter = filters.updatedAfter;
      if (filters.updatedBefore) query.updatedBefore = filters.updatedBefore;

      const response = await api.getExamQuestions(query);
      setExamQuestions(response.examQuestions);
      setPagination(response.pagination);
      setCurrentPage(page);

      // Clear selection when page changes
      setSelectedQuestions(new Set());
      setIsAllSelected(false);
    } catch (error) {
      console.error("Failed to load exam questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemsPerPageChange = (newLimit: number) => {
    setItemsPerPage(newLimit);
    loadExamQuestions(1, newLimit);
  };

  const handleTriggerAnalysis = async (id: string) => {
    try {
      await api.triggerAnalysis(id);
      await loadExamQuestions(currentPage);
    } catch (error) {
      console.error("Failed to trigger analysis:", error);
      alert("Failed to trigger analysis");
    }
  };

  // Bulk selection handlers
  const handleSelectQuestion = (id: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedQuestions(newSelected);
    setIsAllSelected(
      newSelected.size === examQuestions.length && examQuestions.length > 0,
    );
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedQuestions(new Set());
      setIsAllSelected(false);
    } else {
      // Select all questions (allow re-analysis of any question)
      const allIds = examQuestions.map((q) => q.id);
      setSelectedQuestions(new Set(allIds));
      setIsAllSelected(true);
    }
  };

  const handleBulkAnalyze = async () => {
    if (selectedQuestions.size === 0) {
      alert("Please select at least one question to analyze");
      return;
    }

    const questionIds = Array.from(selectedQuestions);

    if (
      !confirm(
        `Are you sure you want to (re-)analyze ${questionIds.length} questions? This may take a few minutes.`,
      )
    ) {
      return;
    }

    setBulkAnalyzing(true);
    setBulkProgress({ current: 0, total: questionIds.length });

    try {
      const result = await api.bulkAnalyzeQuestions(questionIds);

      alert(
        `Bulk analysis queued successfully!\nQueued: ${result.queued}\nSkipped: ${result.skipped}\nAlready Processing: ${result.alreadyProcessing}`,
      );

      // Clear selection and reload
      setSelectedQuestions(new Set());
      setIsAllSelected(false);
      await loadExamQuestions(currentPage);
    } catch (error) {
      console.error("Bulk analysis failed:", error);
      alert("Bulk analysis failed. Please try again.");
    } finally {
      setBulkAnalyzing(false);
      setBulkProgress(null);
    }
  };

  const handleBulkProcess = async () => {
    if (selectedQuestions.size === 0) {
      alert("Please select at least one question to process");
      return;
    }

    const questionIds = Array.from(selectedQuestions);

    if (
      !confirm(
        `Are you sure you want to process ${questionIds.length} questions? Only ANALYZED questions will be processed.`,
      )
    ) {
      return;
    }

    setBulkProcessing(true);

    try {
      const result = await api.bulkProcessQuestions(questionIds);

      alert(
        `Bulk processing complete!\nProcessed: ${result.processed}\nSkipped: ${result.skipped}\nErrors: ${result.errors}`,
      );

      // Clear selection and reload
      setSelectedQuestions(new Set());
      setIsAllSelected(false);
      await loadExamQuestions(currentPage);
    } catch (error) {
      console.error("Bulk processing failed:", error);
      alert("Bulk processing failed. Please try again.");
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkCreateReplicas = async () => {
    setShowReplicaWarningModal(false);

    if (selectedQuestions.size === 0) {
      return;
    }

    const questionIds = Array.from(selectedQuestions);
    setBulkCreatingReplicas(true);

    try {
      const result = await api.bulkCreateReplicas(questionIds);

      alert(
        `Bulk replica creation complete!\nCreated: ${result.created}\nSkipped: ${result.skipped}\nErrors: ${result.errors}`,
      );

      // Clear selection and reload
      setSelectedQuestions(new Set());
      setIsAllSelected(false);
      await loadExamQuestions(currentPage);
    } catch (error) {
      console.error("Bulk replica creation failed:", error);
      alert("Bulk replica creation failed. Please try again.");
    } finally {
      setBulkCreatingReplicas(false);
    }
  };

  const handleBulkGenerateKnowledgePoints = async () => {
    if (selectedQuestions.size === 0) {
      alert("Please select at least one question");
      return;
    }

    const questionIds = Array.from(selectedQuestions);

    if (
      !confirm(
        `Generate knowledge points from ${questionIds.length} questions?\n\nThis will extract spotRule, clinicalCorrelation, and examTrap from ANALYZED Anatomy questions.`,
      )
    ) {
      return;
    }

    setBulkGeneratingKPs(true);

    try {
      const result = await api.bulkGenerateKnowledgePoints(questionIds);

      // Calculate totals
      const totalKps = result.results
        .filter((r: any) => r.success)
        .reduce((sum: number, r: any) => sum + (r.kpCount || 0), 0);

      const spotRuleTotal = result.results
        .filter((r: any) => r.success)
        .reduce((sum: number, r: any) => sum + (r.spotRuleCount || 0), 0);

      const clinicalTotal = result.results
        .filter((r: any) => r.success)
        .reduce(
          (sum: number, r: any) => sum + (r.clinicalCorrelationCount || 0),
          0,
        );

      const trapTotal = result.results
        .filter((r: any) => r.success)
        .reduce((sum: number, r: any) => sum + (r.examTrapCount || 0), 0);

      alert(
        `Knowledge point generation complete!\n\n` +
          `✅ Successful: ${result.successful} questions\n` +
          `❌ Failed: ${result.failed} questions\n\n` +
          `📚 Total KPs Created: ${totalKps}\n` +
          `   - SpotRule: ${spotRuleTotal}\n` +
          `   - Clinical Correlation: ${clinicalTotal}\n` +
          `   - Exam Trap: ${trapTotal}`,
      );

      // Clear selection and reload
      setSelectedQuestions(new Set());
      setIsAllSelected(false);
      await loadExamQuestions(currentPage);
    } catch (error) {
      console.error("Knowledge point generation failed:", error);
      alert("Knowledge point generation failed. Please try again.");
    } finally {
      setBulkGeneratingKPs(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      RAW: { color: "bg-gray-100 text-gray-800", label: "Raw" },
      PENDING: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
      PROCESSING: { color: "bg-blue-100 text-blue-800", label: "Processing" },
      ANALYZED: { color: "bg-green-100 text-green-800", label: "Analyzed" },
      NEEDS_REVIEW: {
        color: "bg-orange-100 text-orange-800",
        label: "Needs Review",
      },
      REVIEWED: { color: "bg-teal-100 text-teal-800", label: "Reviewed" },
      KNOWLEDGE_READY: {
        color: "bg-purple-100 text-purple-800",
        label: "Knowledge Ready",
      },
      CONTENT_READY: {
        color: "bg-indigo-100 text-indigo-800",
        label: "Content Ready",
      },
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

  // All questions are analyzable (allow re-analysis)
  const analyzableQuestions = examQuestions;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exam Questions</h1>
          <p className="text-gray-600 mt-2">Manage TUS exam questions</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/exam-questions/bulk-upload"
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </Link>
          <Link
            href="/exam-questions/new"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Question
          </Link>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedQuestions.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">
                {selectedQuestions.size} question
                {selectedQuestions.size > 1 ? "s" : ""} selected
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedQuestions(new Set());
                setIsAllSelected(false);
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear selection
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBulkAnalyze}
              disabled={
                bulkAnalyzing ||
                bulkProcessing ||
                bulkCreatingReplicas ||
                bulkGeneratingKPs
              }
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Bulk Analyze/Re-analyze ({selectedQuestions.size})
                </>
              )}
            </button>
            <button
              onClick={handleBulkProcess}
              disabled={
                bulkProcessing ||
                bulkAnalyzing ||
                bulkCreatingReplicas ||
                bulkGeneratingKPs
              }
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Bulk Process ({selectedQuestions.size})
                </>
              )}
            </button>
            <button
              onClick={handleBulkGenerateKnowledgePoints}
              disabled={
                bulkGeneratingKPs ||
                bulkAnalyzing ||
                bulkProcessing ||
                bulkCreatingReplicas
              }
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkGeneratingKPs ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating KPs...
                </>
              ) : (
                <>
                  <FileQuestion className="w-4 h-4" />
                  Generate Knowledge Points ({selectedQuestions.size})
                </>
              )}
            </button>
            <button
              onClick={() => setShowReplicaWarningModal(true)}
              disabled={
                bulkCreatingReplicas ||
                bulkAnalyzing ||
                bulkProcessing ||
                bulkGeneratingKPs
              }
              className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkCreatingReplicas ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Replicas...
                </>
              ) : (
                <>
                  <FileQuestion className="w-4 h-4" />
                  Create Exam Replicas ({selectedQuestions.size})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Progress Modal */}
      {bulkProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Analyzing Questions</h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>
                  {bulkProgress.current} / {bulkProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Please wait while we analyze the selected questions. This may take
              a few minutes.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">All Years</option>
              {Array.from({ length: 11 }, (_, i) => 2025 - i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exam Type
            </label>
            <input
              type="text"
              value={filters.examType}
              onChange={(e) =>
                setFilters({ ...filters, examType: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
              placeholder="TUS-1, TUS-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lesson
            </label>
            <input
              type="text"
              value={filters.lesson}
              onChange={(e) =>
                setFilters({ ...filters, lesson: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
              placeholder="Dahiliye, Pediatri..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic
            </label>
            <input
              type="text"
              value={filters.topic}
              onChange={(e) =>
                setFilters({ ...filters, topic: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
              placeholder="Diyabet, Epilepsi..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.analysisStatus}
              onChange={(e) =>
                setFilters({ ...filters, analysisStatus: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">All</option>
              <option value="RAW">Raw (Bulk Uploaded)</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="ANALYZED">Analyzed</option>
              <option value="NEEDS_REVIEW">Needs Review ⚠️</option>
              <option value="REVIEWED">Reviewed ✓</option>
              <option value="KNOWLEDGE_READY">Knowledge Ready</option>
              <option value="CONTENT_READY">Content Ready</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Knowledge Points
            </label>
            <select
              value={filters.hasKnowledgePoints}
              onChange={(e) =>
                setFilters({ ...filters, hasKnowledgePoints: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">All</option>
              <option value="true">Has KP ✓</option>
              <option value="false">No KP ✗</option>
            </select>
          </div>
        </div>

        {/* Sorting and Date Filters */}
        <div className="grid grid-cols-6 gap-4 pt-4 border-t">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters({ ...filters, sortBy: e.target.value as any })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="year">Year</option>
              <option value="createdAt">Created Date</option>
              <option value="updatedAt">Updated Date</option>
              <option value="questionNumber">Question Number</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order
            </label>
            <select
              value={filters.sortOrder}
              onChange={(e) =>
                setFilters({ ...filters, sortOrder: e.target.value as any })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Created After
            </label>
            <input
              type="date"
              value={filters.createdAfter}
              onChange={(e) =>
                setFilters({ ...filters, createdAfter: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Created Before
            </label>
            <input
              type="date"
              value={filters.createdBefore}
              onChange={(e) =>
                setFilters({ ...filters, createdBefore: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Updated After
            </label>
            <input
              type="date"
              value={filters.updatedAfter}
              onChange={(e) =>
                setFilters({ ...filters, updatedAfter: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Updated Before
            </label>
            <input
              type="date"
              value={filters.updatedBefore}
              onChange={(e) =>
                setFilters({ ...filters, updatedBefore: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => loadExamQuestions(1)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Apply Filters
          </button>
          <button
            onClick={() => {
              setFilters({
                year: "",
                examType: "",
                lesson: "",
                topic: "",
                analysisStatus: "",
                hasKnowledgePoints: "",
                sortBy: "year",
                sortOrder: "desc",
                createdAfter: "",
                createdBefore: "",
                updatedAfter: "",
                updatedBefore: "",
              });
              loadExamQuestions(1);
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Select All Bar */}
      {analyzableQuestions.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {isAllSelected ? (
              <CheckSquare className="w-5 h-5 text-blue-600" />
            ) : (
              <Square className="w-5 h-5 text-gray-400" />
            )}
            {isAllSelected ? "Deselect" : "Select"} all questions (
            {analyzableQuestions.length})
          </button>
          <span className="text-xs text-gray-500">
            You can re-analyze questions with any status
          </span>
        </div>
      )}

      {/* Questions List */}
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      ) : examQuestions.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <FileQuestion className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No exam questions found.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {examQuestions.map((question) => {
              const isSelected = selectedQuestions.has(question.id);

              return (
                <div
                  key={question.id}
                  className={`bg-white border rounded-lg p-6 transition-all ${
                    isSelected
                      ? "border-blue-500 shadow-md ring-2 ring-blue-200"
                      : "border-gray-200 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox - all questions can be re-analyzed */}
                    <button
                      onClick={() => handleSelectQuestion(question.id)}
                      className="mt-1 flex-shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <FileQuestion className="w-5 h-5 text-gray-400" />
                              <h3 className="font-semibold text-gray-900">
                                {question.year} - {question.examType || "N/A"}
                                {question.questionNumber &&
                                  ` - Q${question.questionNumber}`}
                              </h3>
                              {getStatusBadge(question.analysisStatus)}
                              {question.lesson && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                                  {question.lesson.name}
                                </span>
                              )}

                              {question.topic && (
                                <ArrowRight className="w-3 h-3 text-gray-400" />
                              )}
                              {question.topic && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                                  {question.topic.name}
                                </span>
                              )}
                              {question.subtopic && (
                                <ArrowRight className="w-3 h-3 text-gray-400" />
                              )}
                              {question.subtopic && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                                  {question.subtopic.name}
                                </span>
                              )}
                              {question._count.knowledgePoints > 0 && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                  {question._count.knowledgePoints} KP
                                </span>
                              )}
                            </div>

                            {question._count.knowledgePoints === 0 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                                0 KP
                              </span>
                            )}
                            {question._count.knowledgePoints > 0 && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                {question._count.knowledgePoints} KP
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {question.question}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/exam-questions/${question.id}`}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          View Details
                        </Link>
                        {!isSelected && (
                          <button
                            onClick={() => handleTriggerAnalysis(question.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                            title={
                              question.analysisStatus === "ANALYZED"
                                ? "Re-analyze question"
                                : "Analyze question"
                            }
                          >
                            <RefreshCw className="w-4 h-4" />
                            {question.analysisStatus === "ANALYZED" ||
                            question.analysisStatus === "KNOWLEDGE_READY" ||
                            question.analysisStatus === "CONTENT_READY"
                              ? "Re-analyze"
                              : "Analyze"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total} questions
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="itemsPerPage"
                    className="text-sm text-gray-600"
                  >
                    Per page:
                  </label>
                  <select
                    id="itemsPerPage"
                    value={itemsPerPage}
                    onChange={(e) =>
                      handleItemsPerPageChange(parseInt(e.target.value))
                    }
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  {/* First Page */}
                  <button
                    onClick={() => loadExamQuestions(1)}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="First Page"
                  >
                    «
                  </button>

                  {/* Previous Page */}
                  <button
                    onClick={() => loadExamQuestions(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Previous Page"
                  >
                    ‹
                  </button>

                  {/* Page Numbers */}
                  {(() => {
                    const pages = [];
                    const totalPages = pagination.totalPages;
                    const current = currentPage;
                    const delta = 2;

                    if (current > delta + 2) {
                      pages.push(
                        <button
                          key={1}
                          onClick={() => loadExamQuestions(1)}
                          className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          1
                        </button>,
                      );
                      if (current > delta + 3) {
                        pages.push(
                          <span
                            key="ellipsis1"
                            className="px-2 py-2 text-gray-500"
                          >
                            ...
                          </span>,
                        );
                      }
                    }

                    for (
                      let i = Math.max(1, current - delta);
                      i <= Math.min(totalPages, current + delta);
                      i++
                    ) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => loadExamQuestions(i)}
                          disabled={loading}
                          className={`px-3 py-2 border rounded transition-colors ${
                            i === current
                              ? "bg-blue-600 text-white border-blue-600 font-semibold"
                              : "border-gray-300 hover:bg-gray-50"
                          } disabled:cursor-not-allowed`}
                        >
                          {i}
                        </button>,
                      );
                    }

                    if (current < totalPages - delta - 1) {
                      if (current < totalPages - delta - 2) {
                        pages.push(
                          <span
                            key="ellipsis2"
                            className="px-2 py-2 text-gray-500"
                          >
                            ...
                          </span>,
                        );
                      }
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => loadExamQuestions(totalPages)}
                          className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          {totalPages}
                        </button>,
                      );
                    }

                    return pages;
                  })()}

                  {/* Next Page */}
                  <button
                    onClick={() => loadExamQuestions(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages || loading}
                    className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Next Page"
                  >
                    ›
                  </button>

                  {/* Last Page */}
                  <button
                    onClick={() => loadExamQuestions(pagination.totalPages)}
                    disabled={currentPage === pagination.totalPages || loading}
                    className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Last Page"
                  >
                    »
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Bulk Replica Warning Modal */}
      {showReplicaWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-amber-100 p-2 rounded-full">
                <FileQuestion className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Create Exam Replicas - Bulk Operation
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  You are about to create {selectedQuestions.size} exam replica
                  question{selectedQuestions.size > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Important Warnings
                </h4>
                <ul className="text-sm text-red-800 space-y-1 ml-6 list-disc">
                  <li>
                    These questions will be{" "}
                    <strong>excluded from adaptive learning algorithms</strong>
                  </li>
                  <li>
                    They will{" "}
                    <strong>not appear in AI-powered analytics</strong>
                  </li>
                  <li>
                    Students will see a{" "}
                    <strong>🟡 &quot;Çıkmış Soru (TUS)&quot; badge</strong>
                  </li>
                  <li>
                    Only <strong>ANALYZED</strong> questions will be processed
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">
                  Legitimate Use Cases
                </h4>
                <ul className="text-sm text-green-800 space-y-1 ml-6 list-disc">
                  <li>Past exam practice (TUS, DUS, etc.)</li>
                  <li>Baseline difficulty calibration</li>
                  <li>Historical pattern recognition training</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">
                  What Will Happen
                </h4>
                <ul className="text-sm text-blue-800 space-y-1 ml-6 list-disc">
                  <li>
                    System will attempt to create replicas for all{" "}
                    {selectedQuestions.size} selected questions
                  </li>
                  <li>Only questions with ANALYZED status will be processed</li>
                  <li>Questions with other statuses will be skipped</li>
                  <li>You will receive a summary report after completion</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReplicaWarningModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkCreateReplicas}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 font-semibold"
              >
                I Understand, Create {selectedQuestions.size} Replica
                {selectedQuestions.size > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
