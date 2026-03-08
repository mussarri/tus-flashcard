/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/api";
import {
  Brain,
  CheckCircle,
  XCircle,
  GitMerge,
  AlertTriangle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface KnowledgeCandidate {
  id: string;
  fact: string;
  category: string | null;
  subcategory: string | null;
  classificationConfidence: number | null;
  sourceCount: number;
  examPattern: string | null; // Pattern type from exam analysis
  approvedContent: {
    id: string;
    content: string;
    block: {
      lesson: string | null;
      topic: string | null;
    };
  };
  similarityMatches?: SimilarityMatch[];
}

interface SimilarityMatch {
  knowledgePointId: string;
  fact: string;
  similarityScore: number;
  category: string | null;
  subcategory: string | null;
}

interface ReviewModalProps {
  candidate: KnowledgeCandidate;
  onClose: () => void;
  onApprove: (candidateId: string) => void;
  onMerge: (candidateId: string, targetId: string) => void;
  onReject: (candidateId: string) => void;
}

function ReviewModal({
  candidate,
  onClose,
  onApprove,
  onMerge,
  onReject,
}: ReviewModalProps) {
  const [selectedMergeTarget, setSelectedMergeTarget] = useState<string | null>(
    null,
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Review Knowledge Point
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  Compare and decide: approve, merge, or reject
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Candidate Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-600 text-white rounded text-xs">
                    NEW
                  </span>
                  Candidate Knowledge Point
                </h3>

                {/* Main Fact Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-5 mb-4 shadow-sm">
                  <div className="flex items-start gap-3 mb-3">
                    <Brain className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-base font-semibold text-gray-900 leading-relaxed">
                      {candidate.fact}
                    </p>
                  </div>

                  {/* Metadata Badges */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {candidate.category && (
                      <span className="px-3 py-1.5 bg-blue-600 text-white rounded-full text-xs font-medium">
                        📚 {candidate.category}
                      </span>
                    )}
                    {candidate.subcategory && (
                      <span className="px-3 py-1.5 bg-green-600 text-white rounded-full text-xs font-medium">
                        🏷️ {candidate.subcategory}
                      </span>
                    )}
                    {candidate.examPattern && (
                      <span className="px-3 py-1.5 bg-orange-600 text-white rounded-full text-xs font-medium">
                        🎓 {candidate.examPattern}
                      </span>
                    )}
                    {candidate.classificationConfidence !== null && (
                      <span className="px-3 py-1.5 bg-purple-600 text-white rounded-full text-xs font-medium">
                        🎯 Confidence:{" "}
                        {Math.round(candidate.classificationConfidence * 100)}%
                      </span>
                    )}
                    <span className="px-3 py-1.5 bg-gray-700 text-white rounded-full text-xs font-medium">
                      📊 Sources: {candidate.sourceCount}
                    </span>
                  </div>
                </div>

                {/* Source Context */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Source Context
                  </h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="mb-3 pb-3 border-b border-gray-200">
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                        {candidate.approvedContent.block.lesson && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded font-medium">
                            📖 {candidate.approvedContent.block.lesson}
                          </span>
                        )}
                        {candidate.approvedContent.block.topic && (
                          <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded font-medium">
                            📑 {candidate.approvedContent.block.topic}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {candidate.approvedContent.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Similar Existing Knowledge Points */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <GitMerge className="w-4 h-4" />
                  Similar Existing Knowledge Points
                  {candidate.similarityMatches &&
                    candidate.similarityMatches.length > 0 && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                        {candidate.similarityMatches.length} match
                        {candidate.similarityMatches.length > 1 ? "es" : ""}
                      </span>
                    )}
                </h3>

                {candidate.similarityMatches &&
                candidate.similarityMatches.length > 0 ? (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {candidate.similarityMatches
                      .sort((a, b) => b.similarityScore - a.similarityScore)
                      .map((match) => {
                        const similarityPercentage = Math.round(
                          match.similarityScore * 100,
                        );
                        const isSelected =
                          selectedMergeTarget === match.knowledgePointId;
                        const isHighMatch = similarityPercentage >= 80;
                        const isMediumMatch = similarityPercentage >= 60;

                        return (
                          <div
                            key={match.knowledgePointId}
                            className={`
                              border-2 rounded-lg p-4 cursor-pointer transition-all duration-200
                              ${
                                isSelected
                                  ? "border-purple-500 bg-purple-50 shadow-md scale-[1.02]"
                                  : isHighMatch
                                    ? "border-red-300 bg-red-50 hover:border-red-400 hover:shadow-md"
                                    : isMediumMatch
                                      ? "border-yellow-300 bg-yellow-50 hover:border-yellow-400 hover:shadow-md"
                                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                              }
                            `}
                            onClick={() =>
                              setSelectedMergeTarget(match.knowledgePointId)
                            }
                          >
                            {/* Similarity Score Badge */}
                            <div className="flex items-center justify-between mb-3">
                              <div
                                className={`
                                px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5
                                ${
                                  isHighMatch
                                    ? "bg-red-600 text-white"
                                    : isMediumMatch
                                      ? "bg-yellow-600 text-white"
                                      : "bg-gray-600 text-white"
                                }
                              `}
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                                {similarityPercentage}% Similar
                                {isHighMatch && (
                                  <AlertTriangle className="w-3.5 h-3.5 ml-1" />
                                )}
                              </div>
                              {isSelected && (
                                <span className="px-2 py-1 bg-purple-600 text-white rounded-full text-xs font-bold flex items-center gap-1">
                                  ✓ Selected
                                </span>
                              )}
                            </div>

                            {/* Fact Text */}
                            <p className="text-sm font-medium text-gray-900 leading-relaxed mb-3">
                              {match.fact}
                            </p>

                            {/* Categories */}
                            <div className="flex flex-wrap gap-2">
                              {match.category && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                  {match.category}
                                </span>
                              )}
                              {match.subcategory && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                  {match.subcategory}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      No similar knowledge points found
                    </p>
                    <p className="text-xs text-gray-500">
                      This appears to be unique content
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              <span className="font-medium">Tip:</span> Click on a similar item
              to select it for merging
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onReject(candidate.id)}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors flex items-center gap-2 font-medium shadow-sm"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
              {selectedMergeTarget && (
                <button
                  onClick={() => onMerge(candidate.id, selectedMergeTarget)}
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-colors flex items-center gap-2 font-medium shadow-sm"
                >
                  <GitMerge className="w-4 h-4" />
                  Merge with Selected
                </button>
              )}
              <button
                onClick={() => onApprove(candidate.id)}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors flex items-center gap-2 font-medium shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Approve as New
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KnowledgeReviewClient() {
  const [candidates, setCandidates] = useState<KnowledgeCandidate[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [sortBy, setSortBy] = useState<
    "createdAt" | "confidence" | "similarity"
  >("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterLesson, setFilterLesson] = useState<string>("");
  const [filterPattern, setFilterPattern] = useState<string>("");
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [lessons, setLessons] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingCandidate, setReviewingCandidate] =
    useState<KnowledgeCandidate | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch knowledge points
  const fetchKnowledgePoints = useCallback(async () => {
    try {
      setLoading(true);

      const result = await api.getKnowledgePointsForReview({
        page,
        limit,
        sortBy,
        sortOrder,
        filterByLesson: filterLesson || undefined,
        filterByPattern: filterPattern || undefined,
      });

      if (result.success) {
        setCandidates(result.data || []);
        setPagination(
          result.pagination || {
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        );

        // Extract unique lessons and patterns
        const uniqueLessons = [
          ...new Set(
            result.data
              .map((c: any) => c.approvedContent?.block?.lesson)
              .filter(Boolean),
          ),
        ];
        const uniquePatterns = [
          ...new Set(
            result.data.map((c: any) => c.examPattern).filter(Boolean),
          ),
        ];
        setLessons(uniqueLessons as string[]);
        setPatterns(uniquePatterns as string[]);
      }
    } catch (error) {
      console.error("Failed to fetch knowledge points:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, filterLesson, filterPattern]);

  useEffect(() => {
    fetchKnowledgePoints();
  }, [fetchKnowledgePoints]);

  const handleApprove = async (candidateId: string) => {
    try {
      const response = await api.approveKnowledgePoint(candidateId);
      if (response.success) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidateId ? { ...c, status: "approved" } : c,
          ),
        );
        setReviewingCandidate(null);
        fetchKnowledgePoints(); // Refresh data
      }
    } catch (error) {
      console.error("Failed to approve knowledge point:", error);
      alert("Failed to approve knowledge point");
    }
  };

  const handleMerge = async (candidateId: string, targetId: string) => {
    if (
      !confirm(
        "Merge this knowledge point with the existing one? The candidate will be merged into the target.",
      )
    ) {
      return;
    }

    try {
      const response = await api.mergeKnowledgePoints(candidateId, targetId);
      if (response.success) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidateId
              ? { ...c, status: "merged", mergedInto: targetId }
              : c,
          ),
        );
        setReviewingCandidate(null);
        fetchKnowledgePoints(); // Refresh data
      }
    } catch (error) {
      console.error("Failed to merge knowledge points:", error);
      alert("Failed to merge knowledge points");
    }
  };

  const handleReject = async (candidateId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;

    try {
      const response = await api.rejectKnowledgePoint(candidateId, reason);
      if (response.success) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidateId
              ? { ...c, status: "rejected", rejectionReason: reason }
              : c,
          ),
        );
        setReviewingCandidate(null);
        fetchKnowledgePoints(); // Refresh data
      }
    } catch (error) {
      console.error("Failed to reject knowledge point:", error);
      alert("Failed to reject knowledge point");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) {
      alert("Please select at least one knowledge point");
      return;
    }

    if (!confirm(`Approve ${selectedIds.size} knowledge points?`)) {
      return;
    }

    try {
      const result = await api.bulkApproveKnowledgePoints(
        Array.from(selectedIds),
      );

      if (result.success) {
        alert(`Approved ${result.successful} knowledge points`);
        setSelectedIds(new Set());
        fetchKnowledgePoints();
      }
    } catch (error) {
      console.error("Failed to bulk approve:", error);
      alert("Failed to bulk approve knowledge points");
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) {
      alert("Please select at least one knowledge point");
      return;
    }

    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;

    try {
      const result = await api.bulkRejectKnowledgePoints(
        Array.from(selectedIds),
        reason,
      );

      if (result.success) {
        alert(`Rejected ${result.successful} knowledge points`);
        setSelectedIds(new Set());
        fetchKnowledgePoints();
      }
    } catch (error) {
      console.error("Failed to bulk reject:", error);
      alert("Failed to bulk reject knowledge points");
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.id)));
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      { color: string; bgColor: string; icon: string; label: string }
    > = {
      pending: {
        color: "text-yellow-700",
        bgColor: "bg-yellow-100 border-yellow-300",
        icon: "⏳",
        label: "Pending Review",
      },
      approved: {
        color: "text-green-700",
        bgColor: "bg-green-100 border-green-300",
        icon: "✅",
        label: "Approved",
      },
      merged: {
        color: "text-purple-700",
        bgColor: "bg-purple-100 border-purple-300",
        icon: "🔀",
        label: "Merged",
      },
      rejected: {
        color: "text-red-700",
        bgColor: "bg-red-100 border-red-300",
        icon: "❌",
        label: "Rejected",
      },
    };

    const c = config[status] || {
      color: "text-gray-700",
      bgColor: "bg-gray-100 border-gray-300",
      icon: "❓",
      label: status,
    };
    return (
      <span
        className={`px-3 py-1.5 text-xs font-bold rounded-full border ${c.bgColor} ${c.color} inline-flex items-center gap-1.5`}
      >
        <span>{c.icon}</span>
        {c.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading knowledge points...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Review</h1>
        </div>
        <p className="text-gray-600">
          Review, approve, merge, or reject knowledge point candidates
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase">
                Total
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {pagination.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase">
                Current Page
              </p>
              <p className="text-2xl font-bold text-yellow-600">
                {candidates.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase">
                Page
              </p>
              <p className="text-2xl font-bold text-green-600">
                {page} of {pagination.totalPages}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase">
                Patterns
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {patterns.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <GitMerge className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Lesson
            </label>
            <select
              value={filterLesson}
              onChange={(e) => {
                setFilterLesson(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Lessons</option>
              {lessons.map((lesson) => (
                <option key={lesson} value={lesson}>
                  {lesson}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Exam Pattern
            </label>
            <select
              value={filterPattern}
              onChange={(e) => {
                setFilterPattern(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Patterns</option>
              {patterns.map((pattern) => (
                <option key={pattern} value={pattern}>
                  {pattern}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="createdAt">Date Created</option>
              <option value="confidence">Confidence</option>
              <option value="similarity">Similarity</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Order
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 w-full">
            <span className="text-sm font-medium text-blue-900">
              {selectedIds.size} selected
            </span>
            <button
              onClick={handleBulkApprove}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              Bulk Approve
            </button>
            <button
              onClick={handleBulkReject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <XCircle className="w-4 h-4" />
              Bulk Reject
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium ml-auto"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === candidates.length &&
                      candidates.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Knowledge Point
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Topic / Lesson
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Similarity
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {candidates.map((candidate) => {
                const maxSimilarity =
                  candidate.similarityMatches &&
                  candidate.similarityMatches.length > 0
                    ? Math.max(
                        ...candidate.similarityMatches.map(
                          (m) => m.similarityScore,
                        ),
                      )
                    : 0;
                const similarityPercentage = Math.round(maxSimilarity * 100);
                const hasHighSimilarity = similarityPercentage >= 80;

                return (
                  <tr
                    key={candidate.id}
                    className={`
                      hover:bg-blue-50 transition-colors duration-150
                      ${hasHighSimilarity ? "bg-red-50" : ""}
                    `}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(candidate.id)}
                        onChange={() => toggleSelection(candidate.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <p className="text-sm font-semibold text-gray-900 leading-relaxed mb-1">
                        {candidate.fact}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {candidate.subcategory && (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                            {candidate.subcategory}
                          </span>
                        )}
                        {candidate.examPattern && (
                          <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                            🎓 {candidate.examPattern}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          📊 {candidate.sourceCount} source
                          {candidate.sourceCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {candidate.approvedContent.block.lesson && (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium w-max">
                              📖 {candidate.approvedContent.block.lesson}
                            </span>
                          </div>
                        )}
                        {candidate.approvedContent.block.topic && (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded text-xs font-medium">
                              📑 {candidate.approvedContent.block.topic}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {maxSimilarity > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <TrendingUp
                              className={`
                              w-4 h-4
                              ${
                                similarityPercentage >= 80
                                  ? "text-red-600"
                                  : similarityPercentage >= 60
                                    ? "text-yellow-600"
                                    : "text-gray-400"
                              }
                            `}
                            />
                            <span
                              className={`
                                text-sm font-bold
                                ${
                                  similarityPercentage >= 80
                                    ? "text-red-600"
                                    : similarityPercentage >= 60
                                      ? "text-yellow-600"
                                      : "text-gray-600"
                                }
                              `}
                            >
                              {similarityPercentage}%
                            </span>
                            {similarityPercentage >= 80 && (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <span className="text-xs text-gray-500 block">
                            {candidate.similarityMatches?.length || 0} match
                            {(candidate.similarityMatches?.length || 0) > 1
                              ? "es"
                              : ""}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-400">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs">Unique</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {candidate.classificationConfidence !== null && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                            <div
                              className={`
                                h-2 rounded-full transition-all duration-300
                                ${
                                  candidate.classificationConfidence >= 0.8
                                    ? "bg-green-500"
                                    : candidate.classificationConfidence >= 0.6
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }
                              `}
                              style={{
                                width: `${candidate.classificationConfidence * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">
                            {Math.round(
                              candidate.classificationConfidence * 100,
                            )}
                            %
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge((candidate as any).status || "pending")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {((candidate as any).status === "pending" ||
                        !(candidate as any).status) && (
                        <button
                          onClick={() => setReviewingCandidate(candidate)}
                          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm flex items-center gap-2 ml-auto"
                        >
                          <Brain className="w-4 h-4" />
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {candidates.length === 0 && (
          <div className="p-12 text-center">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No candidates found</p>
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting your filters
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between rounded-b-lg">
          <div className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">{(page - 1) * limit + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(page * limit, pagination.total)}
            </span>{" "}
            of <span className="font-medium">{pagination.total}</span> results
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <div className="px-4 py-2 text-sm text-gray-700 font-medium">
              Page {page} of {pagination.totalPages}
            </div>
            <button
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={!pagination.hasNextPage}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewingCandidate && (
        <ReviewModal
          candidate={reviewingCandidate}
          onClose={() => setReviewingCandidate(null)}
          onApprove={handleApprove}
          onMerge={handleMerge}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
