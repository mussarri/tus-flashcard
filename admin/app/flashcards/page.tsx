/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import {
  CreditCard,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle,
  XCircle,
  BarChart3,
  AlertCircle,
  Search,
  X,
  Edit,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  cardType: string;
  lessonId: string | null;
  topicId: string | null;
  approvalStatus: string;
  visualStatus: string;
  imageAssetId: string | null;
  useVisual: boolean;
  examPattern?: string;
  trapData?: any;
  lesson?: { id: string; name: string; displayName?: string };
  topic?: { id: string; name: string; displayName?: string };
  knowledgePoint?: {
    id: string;
    fact: string;
  };
  examQuestion?: {
    id: string;
    question: string;
  };
  createdAt: string;
}

interface FlashcardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  requiresVisual: number;
  visualUploaded: number;
  byCardType: Array<{ cardType: string; _count: number }>;
}

interface Lesson {
  id: string;
  name: string;
  displayName: string;
}

interface Topic {
  id: string;
  name: string;
  displayName: string;
  lessonId: string;
}

export default function FlashcardsPage() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "stats">("list");
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [cardTypeFilter, setCardTypeFilter] = useState<string>("all");
  const [lessonFilter, setLessonFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showBack, setShowBack] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    loadLessonsAndTopics();
  }, []);

  useEffect(() => {
    loadFlashcards();
    loadStats();
  }, [
    filter,
    cardTypeFilter,
    lessonFilter,
    topicFilter,
    searchQuery,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
  ]);

  const loadLessonsAndTopics = async () => {
    try {
      const response = await api.getTopics();
      setLessons(response.lessons || []);
      setTopics(response.topics || []);
    } catch (error) {
      console.error("Failed to load lessons and topics:", error);
    }
  };

  const loadFlashcards = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all")
        params.append("approvalStatus", filter.toUpperCase());
      if (cardTypeFilter !== "all") params.append("cardType", cardTypeFilter);
      if (lessonFilter !== "all") params.append("lessonId", lessonFilter);
      if (topicFilter !== "all") params.append("topicId", topicFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (sortBy) params.append("sortBy", sortBy);
      if (sortOrder) params.append("sortOrder", sortOrder);
      params.append("page", currentPage.toString());
      params.append("pageSize", pageSize.toString());

      const response = await api.getFlashcardsWithVisual(params.toString());
      console.log(response);

      setFlashcards(response.flashcards.flashcards || []);
      if (response.flashcards.pagination) {
        setTotalPages(response.flashcards.pagination.totalPages);
        setTotalCount(response.flashcards.pagination.total);
      }
    } catch (error) {
      console.error("Failed to load flashcards:", error);
      setFlashcards([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.getFlashcardStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const toggleShowBack = (id: string) => {
    setShowBack((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setFilter("all");
    setCardTypeFilter("all");
    setLessonFilter("all");
    setTopicFilter("all");
    setSearchQuery("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this flashcard?")) {
      return;
    }

    try {
      await api.deleteFlashcard(id);
      await loadFlashcards();
      alert("Flashcard deleted successfully!");
    } catch (error) {
      console.error("Failed to delete flashcard:", error);
      alert("Failed to delete flashcard. Check console for details.");
    }
  };

  const filteredTopics =
    lessonFilter !== "all"
      ? topics.filter((t) => t.lessonId === lessonFilter)
      : topics;

  const getCardTypeBadge = (type: string) => {
    const config: Record<string, { color: string }> = {
      STRUCTURE_ID: { color: "bg-blue-100 text-blue-800" },
      CONTENTS_OF_SPACE: { color: "bg-green-100 text-green-800" },
      FUNCTIONAL_ANATOMY: { color: "bg-purple-100 text-purple-800" },
      RELATIONS_BORDERS: { color: "bg-yellow-100 text-yellow-800" },
      LESION_ANATOMY: { color: "bg-red-100 text-red-800" },
      EMBRYOLOGIC_ORIGIN: { color: "bg-indigo-100 text-indigo-800" },
      CLINICAL_CORRELATION: { color: "bg-pink-100 text-pink-800" },
      HIGH_YIELD_DISTINCTION: { color: "bg-orange-100 text-orange-800" },
      EXCEPT_TRAP: { color: "bg-rose-100 text-rose-800" },
      TOPOGRAPHIC_MAP: { color: "bg-cyan-100 text-cyan-800" },
      SPOT: { color: "bg-gray-100 text-gray-800" },
      TRAP: { color: "bg-amber-100 text-amber-800" },
      CLINICAL_TIP: { color: "bg-teal-100 text-teal-800" },
      COMPARISON: { color: "bg-violet-100 text-violet-800" },
    };

    const c = config[type] || { color: "bg-gray-100 text-gray-800" };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${c.color}`}>
        {type.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Flashcards Library
          </h1>
          <p className="text-gray-600">
            Browse all generated flashcards with AALE adaptive learning
          </p>
        </div>

        <Link
          href="/flashcards/review"
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          Review Queue ({stats?.pending || 0})
        </Link>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">Approved</div>
            <div className="text-2xl font-bold text-green-600">
              {stats.approved}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">Rejected</div>
            <div className="text-2xl font-bold text-red-600">
              {stats.rejected}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">Needs Visual</div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.requiresVisual}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">Visual Ready</div>
            <div className="text-2xl font-bold text-purple-600">
              {stats.visualUploaded}
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-2 rounded flex items-center gap-2 ${
              activeTab === "list"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Flashcard List
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-2 rounded flex items-center gap-2 ${
              activeTab === "stats"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Statistics
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {activeTab === "list" && (
        <>
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in flashcard front or back..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Filters Row */}
          <div className="mb-6 grid grid-cols-6 gap-3">
            <select
              value={filter}
              onChange={(e) =>
                setFilter(
                  e.target.value as "all" | "pending" | "approved" | "rejected",
                )
              }
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={cardTypeFilter}
              onChange={(e) => setCardTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="all">All Types</option>
              <option value="STRUCTURE_ID">Structure ID</option>
              <option value="CONTENTS_OF_SPACE">Contents of Space</option>
              <option value="FUNCTIONAL_ANATOMY">Functional Anatomy</option>
              <option value="RELATIONS_BORDERS">Relations/Borders</option>
              <option value="LESION_ANATOMY">Lesion Anatomy</option>
              <option value="EMBRYOLOGIC_ORIGIN">Embryologic Origin</option>
              <option value="CLINICAL_CORRELATION">Clinical Correlation</option>
              <option value="HIGH_YIELD_DISTINCTION">
                High-Yield Distinction
              </option>
              <option value="EXCEPT_TRAP">Except Trap</option>
              <option value="TOPOGRAPHIC_MAP">Topographic Map</option>
            </select>

            <select
              value={lessonFilter}
              onChange={(e) => {
                setLessonFilter(e.target.value);
                setTopicFilter("all");
              }}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="all">All Lessons</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.displayName || lesson.name}
                </option>
              ))}
            </select>

            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
              disabled={lessonFilter === "all"}
            >
              <option value="all">All Topics</option>
              {filteredTopics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.displayName || topic.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="createdAt">Sort: Date</option>
              <option value="cardType">Sort: Type</option>
              <option value="approvalStatus">Sort: Status</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          {/* Active Filters Summary */}
          {(filter !== "all" ||
            cardTypeFilter !== "all" ||
            lessonFilter !== "all" ||
            topicFilter !== "all" ||
            searchQuery ||
            sortBy !== "createdAt" ||
            sortOrder !== "desc") && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {filter !== "all" && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                  Status: {filter}
                </span>
              )}
              {cardTypeFilter !== "all" && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                  Type: {cardTypeFilter.replace(/_/g, " ")}
                </span>
              )}
              {lessonFilter !== "all" && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                  Lesson:{" "}
                  {lessons.find((l) => l.id === lessonFilter)?.displayName}
                </span>
              )}
              {topicFilter !== "all" && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                  Topic: {topics.find((t) => t.id === topicFilter)?.displayName}
                </span>
              )}
              {searchQuery && (
                <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded">
                  Search: &quot;{searchQuery}&quot;
                </span>
              )}
              <button
                onClick={clearFilters}
                className="ml-2 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear all
              </button>
            </div>
          )}
        </>
      )}

      {/* List Tab */}
      {activeTab === "list" && (
        <>
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ) : flashcards.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-500">
                No flashcards found with current filters.
              </p>
            </div>
          ) : (
            <>
              {/* Results Summary */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-900 font-medium">
                    Showing {flashcards.length} of {totalCount} flashcard
                    {totalCount !== 1 ? "s" : ""} (Page {currentPage} of{" "}
                    {totalPages})
                  </span>
                  <div className="flex gap-4 text-blue-700">
                    <span>
                      {
                        flashcards.filter((f) => f.visualStatus === "REQUIRED")
                          .length
                      }{" "}
                      need visual
                    </span>
                    <span>
                      {
                        flashcards.filter((f) => f.approvalStatus === "PENDING")
                          .length
                      }{" "}
                      pending
                    </span>
                    <span>
                      {
                        flashcards.filter(
                          (f) => f.approvalStatus === "APPROVED",
                        ).length
                      }{" "}
                      approved
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {flashcards.map((flashcard) => {
                  const statusConfig: Record<
                    string,
                    { color: string; icon: any; label: string }
                  > = {
                    PENDING: {
                      color: "border-yellow-300 bg-yellow-50",
                      icon: RefreshCw,
                      label: "Pending",
                    },
                    APPROVED: {
                      color: "border-green-300 bg-green-50",
                      icon: CheckCircle,
                      label: "Approved",
                    },
                    REJECTED: {
                      color: "border-red-300 bg-red-50",
                      icon: XCircle,
                      label: "Rejected",
                    },
                  };

                  const statusInfo = statusConfig[flashcard.approvalStatus] || {
                    color: "border-gray-300 bg-gray-50",
                    icon: CreditCard,
                    label: flashcard.approvalStatus,
                  };
                  const StatusIcon = statusInfo.icon;

                  return (
                    <div
                      key={flashcard.id}
                      className={`border-2 rounded-lg overflow-hidden ${
                        flashcard.visualStatus === "REQUIRED"
                          ? "border-blue-400 bg-blue-50"
                          : statusInfo.color
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex gap-2 items-center flex-wrap">
                            {getCardTypeBadge(flashcard.cardType)}
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded flex items-center gap-1 ${
                                flashcard.approvalStatus === "PENDING"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : flashcard.approvalStatus === "APPROVED"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                              }`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {statusInfo.label}
                            </span>
                            {flashcard.visualStatus === "REQUIRED" && (
                              <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded flex items-center gap-1 animate-pulse">
                                🖼️ Visual Required
                              </span>
                            )}
                            {flashcard.visualStatus === "UPLOADED" && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded border border-green-200">
                                ✓ Visual Uploaded
                              </span>
                            )}
                            {flashcard.examPattern && (
                              <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded border border-purple-200">
                                {flashcard.examPattern}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {flashcard.lesson?.name}{" "}
                            {flashcard.topic && `› ${flashcard.topic.name}`}
                          </div>
                        </div>

                        {/* Preview Card - Mobile Style */}
                        <div className="max-w-sm mx-auto mb-3">
                          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
                            {/* Front */}
                            <div className="bg-gradient-to-br from-blue-50 to-white p-6 min-h-[180px] flex flex-col items-center justify-center">
                              {flashcard.imageAssetId && (
                                <div className="mb-4 w-full">
                                  <img
                                    src={`${process.env.NEXT_PUBLIC_API_URL}/admin/visual-assets/${flashcard.imageAssetId}`}
                                    alt="Visual"
                                    className="max-w-full max-h-32 mx-auto rounded-lg object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                </div>
                              )}
                              <p className="text-center text-lg font-medium text-gray-900">
                                {flashcard.front}
                              </p>
                            </div>

                            {showBack.has(flashcard.id) && (
                              <>
                                <div className="border-t-2 border-dashed border-gray-300"></div>
                                {/* Back */}
                                <div className="bg-gradient-to-br from-green-50 to-white p-6 min-h-[180px] flex items-center justify-center">
                                  <p className="text-center text-lg text-gray-900">
                                    {flashcard.back}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          {flashcard.knowledgePoint && (
                            <Link
                              href={`/knowledge-points/${flashcard.knowledgePoint.id}`}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              View Knowledge Point →
                            </Link>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleShowBack(flashcard.id)}
                              className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                            >
                              {showBack.has(flashcard.id) ? (
                                <>
                                  <EyeOff className="w-4 h-4" />
                                  Hide Back
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4" />
                                  Show Back
                                </>
                              )}
                            </button>
                            <Link
                              href={`/flashcards/${flashcard.id}`}
                              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDelete(flashcard.id)}
                              className="text-sm px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Items per page:
                    </span>
                    <select
                      value={pageSize}
                      onChange={(e) =>
                        handlePageSizeChange(Number(e.target.value))
                      }
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      First
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>

                    <div className="flex gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-2 border rounded text-sm ${
                                currentPage === pageNum
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        },
                      )}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Last
                    </button>
                  </div>

                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Statistics Tab */}
      {activeTab === "stats" && stats && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Card Type Distribution</h2>
          <div className="grid grid-cols-4 gap-4">
            {stats.byCardType.map((item) => (
              <div
                key={item.cardType}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                {getCardTypeBadge(item.cardType)}
                <div className="text-2xl font-bold mt-2">{item._count}</div>
                <div className="text-sm text-gray-600">
                  {((item._count / stats.total) * 100).toFixed(1)}% of total
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
