/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  GitMerge,
  Clock,
  Trash2,
} from "lucide-react";

interface KnowledgePoint {
  id: string;
  fact: string;
  priority: number;
  examRelevance: number | null;
  examPattern: string | null;
  approvalStatus: string;
  rejectionReason: string | null;
  classificationConfidence: number | null;
  sourceCount: number;
  createdAt: string;
  lesson: {
    id: string;
    name: string;
  };
  topic: {
    id: string;
    name: string;
  } | null;
  subtopic: {
    id: string;
    name: string;
  } | null;
}

export default function KnowledgePointsPage() {
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLesson, setFilterLesson] = useState("");
  const [filterApprovalStatus, setFilterApprovalStatus] = useState("");
  const [filterHasFlashcard, setFilterHasFlashcard] = useState<string>("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection
  const [selectedKPs, setSelectedKPs] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Available lessons (we'll populate this from the data)
  const [lessons, setLessons] = useState<string[]>([]);

  const fetchKnowledgePoints = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });

      if (searchQuery) params.append("search", searchQuery);
      if (filterLesson) params.append("filterByLesson", filterLesson);
      if (filterApprovalStatus)
        params.append("filterByApprovalStatus", filterApprovalStatus);
      if (filterHasFlashcard !== "")
        params.append("hasFlashcard", filterHasFlashcard);

      const queryString = params.toString();
      const response = await api.getKnowledgePoints(
        queryString ? `?${queryString}` : "",
      );

      if (response && response.success) {
        setKnowledgePoints(response.data || []);
        setPagination(
          response.pagination || {
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        );

        // Extract unique lessons
        const uniqueLessons = [
          ...new Set(
            response.data
              .map((kp: KnowledgePoint) => kp.lesson?.name)
              .filter(Boolean),
          ),
        ];
        setLessons(uniqueLessons as string[]);
      }
    } catch (error) {
      console.error("Failed to fetch knowledge points:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgePoints();
  }, [
    page,
    limit,
    sortBy,
    sortOrder,
    filterLesson,
    filterApprovalStatus,
    filterHasFlashcard,
  ]);

  const handleSearch = () => {
    setPage(1);
    fetchKnowledgePoints();
  };

  const toggleSelectKP = (id: string) => {
    const newSelected = new Set(selectedKPs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedKPs(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedKPs.size === knowledgePoints.length) {
      setSelectedKPs(new Set());
    } else {
      setSelectedKPs(new Set(knowledgePoints.map((kp) => kp.id)));
    }
  };

  const handleGenerateFlashcards = async () => {
    if (selectedKPs.size === 0) {
      alert("Please select at least one knowledge point");
      return;
    }

    if (
      !confirm(
        `Generate flashcards for ${selectedKPs.size} selected knowledge points?`,
      )
    ) {
      return;
    }

    try {
      setIsGenerating(true);
      const result = await api.generateFlashcardsForKnowledgePoints(
        Array.from(selectedKPs),
      );

      alert(
        `Success! Queued: ${result.queued}, Skipped: ${result.skipped}${result.errors.length > 0 ? `, Errors: ${result.errors.length}` : ""}`,
      );

      // Clear selection and refresh
      setSelectedKPs(new Set());
      fetchKnowledgePoints();
    } catch (error) {
      console.error("Failed to generate flashcards:", error);
      alert("Failed to generate flashcards. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedKPs.size === 0) {
      alert("Please select at least one knowledge point");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedKPs.size} knowledge point${selectedKPs.size > 1 ? "s" : ""}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      const result = await api.bulkDeleteKnowledgePoints(
        Array.from(selectedKPs),
      );

      alert(
        `Success! Deleted: ${result.deleted}${result.failed > 0 ? `, Failed: ${result.failed}` : ""}${result.errors.length > 0 ? `\nErrors: ${result.errors.map((e) => e.error).join(", ")}` : ""}`,
      );

      // Clear selection and refresh
      setSelectedKPs(new Set());
      fetchKnowledgePoints();
    } catch (error) {
      console.error("Failed to delete knowledge points:", error);
      alert("Failed to delete knowledge points. Check console for details.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getApprovalStatusBadge = (status: string) => {
    const config: Record<
      string,
      { icon: React.ComponentType<any>; color: string; label: string }
    > = {
      PENDING: {
        icon: Clock,
        color: "bg-yellow-100 text-yellow-800",
        label: "Pending",
      },
      APPROVED: {
        icon: CheckCircle,
        color: "bg-green-100 text-green-800",
        label: "Approved",
      },
      REJECTED: {
        icon: XCircle,
        color: "bg-red-100 text-red-800",
        label: "Rejected",
      },
      MERGED: {
        icon: GitMerge,
        color: "bg-purple-100 text-purple-800",
        label: "Merged",
      },
    };

    const c = config[status] || {
      icon: Clock,
      color: "bg-gray-100 text-gray-800",
      label: status,
    };
    const Icon = c.icon;

    return (
      <span
        className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${c.color}`}
      >
        <Icon className="w-3 h-3" />
        {c.label}
      </span>
    );
  };

  if (loading && knowledgePoints.length === 0) {
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Brain className="w-8 h-8 text-blue-600" />
          Knowledge Points
        </h1>
        <p className="text-gray-600 mt-2">
          View and manage all knowledge points extracted from approved content.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search in facts..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
          </div>

          {/* Lesson Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lesson
            </label>
            <select
              value={filterLesson}
              onChange={(e) => {
                setFilterLesson(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Lessons</option>
              {lessons.map((lesson) => (
                <option key={lesson} value={lesson}>
                  {lesson}
                </option>
              ))}
            </select>
          </div>

          {/* Approval Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filterApprovalStatus}
              onChange={(e) => {
                setFilterApprovalStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="MERGED">Merged</option>
            </select>
          </div>

          {/* Has Flashcard Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Flashcard
            </label>
            <select
              value={filterHasFlashcard}
              onChange={(e) => {
                setFilterHasFlashcard(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="true">Has Flashcard</option>
              <option value="false">No Flashcard</option>
            </select>
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-4 mt-4">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="createdAt">Created Date</option>
            <option value="priority">Priority</option>
            <option value="confidence">Confidence</option>
            <option value="sourceCount">Source Count</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            {sortOrder === "asc" ? "↑ Ascending" : "↓ Descending"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-gray-600">
          Showing {knowledgePoints.length} of {pagination.total} knowledge
          points
        </p>
      </div>

      {/* Bulk Actions */}
      {selectedKPs.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedKPs.size} knowledge point
                {selectedKPs.size > 1 ? "s" : ""} selected
              </span>
              <button
                onClick={() => setSelectedKPs(new Set())}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin">⚡</span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Selected
                  </>
                )}
              </button>
              <button
                onClick={handleGenerateFlashcards}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin">⚡</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span>🎴</span>
                    Generate Flashcards
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Points List */}
      {knowledgePoints.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No knowledge points found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={
                  knowledgePoints.length > 0 &&
                  selectedKPs.size === knowledgePoints.length
                }
                onChange={toggleSelectAll}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <h2 className="text-lg font-semibold text-gray-900">
                {pagination.total || knowledgePoints.length} Knowledge Points
              </h2>
            </div>
            <div className="text-sm text-gray-600">
              {selectedKPs.size > 0 && `${selectedKPs.size} selected`}
            </div>
          </div>
          <div className="p-4 space-y-4">
            {knowledgePoints.map((kp) => (
              <div
                key={kp.id}
                className={`bg-white border rounded-lg p-6 hover:shadow-md transition-shadow ${
                  selectedKPs.has(kp.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedKPs.has(kp.id)}
                    onChange={() => toggleSelectKP(kp.id)}
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getApprovalStatusBadge(kp.approvalStatus)}
                          <span className="text-xs text-gray-500">
                            ID: {kp.id.substring(0, 8)}
                          </span>
                        </div>
                        <p className="text-base font-medium text-gray-900 leading-relaxed mb-3">
                          {kp.fact}
                        </p>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-medium">
                        📚 {kp.lesson.name}
                      </span>
                      {kp.topic && (
                        <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded font-medium">
                          📑 {kp.topic.name}
                        </span>
                      )}
                      {kp.subtopic && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                          🏷️ {kp.subtopic.name}
                        </span>
                      )}
                      {kp.examPattern && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium">
                          🎓 {kp.examPattern}
                        </span>
                      )}
                      {kp.classificationConfidence !== null && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
                          🎯 {Math.round(kp.classificationConfidence * 100)}%
                        </span>
                      )}
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-medium">
                        📊 Sources: {kp.sourceCount}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                        ⭐ Priority: {kp.priority}
                      </span>
                    </div>

                    {/* Rejection Reason */}
                    {kp.rejectionReason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-xs text-red-800">
                          <strong>Rejection Reason:</strong>{" "}
                          {kp.rejectionReason}
                        </p>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Created:{" "}
                        {new Date(kp.createdAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, pagination.total)} of {pagination.total}{" "}
                knowledge points
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="itemsPerPage" className="text-sm text-gray-600">
                  Per page:
                </label>
                <select
                  id="itemsPerPage"
                  value={limit}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value);
                    setLimit(newLimit);
                    setPage(1);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
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
                  onClick={() => setPage(1)}
                  disabled={page === 1 || loading}
                  className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="First Page"
                >
                  «
                </button>

                {/* Previous Page */}
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || loading}
                  className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Previous Page"
                >
                  ‹
                </button>

                {/* Page Numbers */}
                {(() => {
                  const pages = [];
                  const totalPages = pagination.totalPages;
                  const current = page;
                  const delta = 2;

                  if (current > delta + 2) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setPage(1)}
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
                        onClick={() => setPage(i)}
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
                        onClick={() => setPage(totalPages)}
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
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages || loading}
                  className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Next Page"
                >
                  ›
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setPage(pagination.totalPages)}
                  disabled={page === pagination.totalPages || loading}
                  className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Last Page"
                >
                  »
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
