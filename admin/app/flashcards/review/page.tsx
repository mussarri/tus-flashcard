/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import {
  CheckCircle,
  XCircle,
  Upload,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
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
  createdAt: string;
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

export default function FlashcardsReviewPage() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardTypeFilter, setCardTypeFilter] = useState<string>("all");
  const [lessonFilter, setLessonFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [visualRequiredFilter, setVisualRequiredFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [uploadingVisual, setUploadingVisual] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showBack, setShowBack] = useState<Set<string>>(new Set());
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState<string | null>(null);
  const [imageAssets, setImageAssets] = useState<any[]>([]);
  const [assetSearch, setAssetSearch] = useState<string>("");
  const [loadingAssets, setLoadingAssets] = useState(false);

  useEffect(() => {
    loadLessonsAndTopics();
  }, []);

  useEffect(() => {
    loadFlashcards();
  }, [cardTypeFilter, lessonFilter, topicFilter, visualRequiredFilter, searchQuery]);

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
      const params = new URLSearchParams({
        approvalStatus: "PENDING",
      });
      if (cardTypeFilter !== "all") params.append("cardType", cardTypeFilter);
      if (lessonFilter !== "all") params.append("lessonId", lessonFilter);
      if (topicFilter !== "all") params.append("topicId", topicFilter);
      if (visualRequiredFilter !== "all") params.append("visualRequirement", visualRequiredFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const response = await api.getFlashcardsWithVisual(params.toString());
      setFlashcards(response?.flashcards || []);
    } catch (error) {
      console.error("Failed to load flashcards:", error);
      setFlashcards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.publishFlashcard(id);
      await loadFlashcards();
      alert("Flashcard approved successfully!");
    } catch (error) {
      console.error("Failed to approve flashcard:", error);
      alert("Failed to approve flashcard. Check console for details.");
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      // TODO: Implement reject endpoint
      console.log("Rejecting flashcard:", id, reason);
      await loadFlashcards();
      alert("Flashcard rejected successfully!");
    } catch (error) {
      console.error("Failed to reject flashcard:", error);
      alert("Failed to reject flashcard. Check console for details.");
    }
  };

  const handleUploadVisual = async (id: string, file: File) => {
    setUploadingVisual(id);
    try {
      const result = await api.uploadFlashcardVisual(id, file);
      if (result.imageAssetId) {
        await loadFlashcards();
        alert("Visual uploaded successfully!");
      }
    } catch (error) {
      console.error("Failed to upload visual:", error);
      alert("Failed to upload visual. Check console for details.");
    } finally {
      setUploadingVisual(null);
    }
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

  const handleBulkApprove = async () => {
    if (selectedCards.size === 0) {
      alert("Please select at least one flashcard");
      return;
    }

    if (!confirm(`Approve ${selectedCards.size} selected flashcard(s)?`)) {
      return;
    }

    try {
      setIsBulkApproving(true);
      const result = await api.bulkPublishFlashcards(Array.from(selectedCards));

      if (result.success) {
        alert(
          `Bulk approve completed!\nSuccessful: ${result.successful.length}\nFailed: ${result.failed.length}${result.failed.length > 0 ? `\n\nFailed cards:\n${result.failed.map((f: any) => `- ${f.id}: ${f.reason}`).join("\n")}` : ""}`,
        );
        setSelectedCards(new Set());
        await loadFlashcards();
      }
    } catch (error) {
      console.error("Failed to bulk approve:", error);
      alert("Failed to bulk approve. Check console for details.");
    } finally {
      setIsBulkApproving(false);
    }
  };

  const toggleSelectCard = (id: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCards.size === flashcards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(flashcards.map((f) => f.id)));
    }
  };

  const loadImageAssets = async (search?: string) => {
    setLoadingAssets(true);
    try {
      const result = await api.getImageAssets({ search, limit: 50 });
      setImageAssets(result.assets);
    } catch (error) {
      console.error("Failed to load image assets:", error);
      alert("Failed to load image assets");
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleBindAsset = async (flashcardId: string, assetId: string) => {
    setUploadingVisual(flashcardId);
    try {
      await api.bindFlashcardVisual(flashcardId, { imageAssetId: assetId });
      await loadFlashcards();
      setShowAssetPicker(null);
      alert("Visual asset bound successfully!");
    } catch (error) {
      console.error("Failed to bind visual asset:", error);
      alert("Failed to bind visual asset");
    } finally {
      setUploadingVisual(null);
    }
  };

  useEffect(() => {
    if (showAssetPicker) {
      loadImageAssets();
    }
  }, [showAssetPicker]);

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

  const toggleExpand = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  const clearFilters = () => {
    setCardTypeFilter("all");
    setLessonFilter("all");
    setTopicFilter("all");
    setVisualRequiredFilter("all");
    setSearchQuery("");
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
    };

    const c = config[type] || { color: "bg-gray-100 text-gray-800" };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${c.color}`}>
        {type.replace(/_/g, " ")}
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

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Flashcard Review Queue
        </h1>
        <p className="text-gray-600">
          Review and approve pending flashcards ({flashcards.length} pending)
        </p>
      </div>

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

      {/* Filters */}
      <div className="mb-6 grid grid-cols-5 gap-3">
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
          <option value="HIGH_YIELD_DISTINCTION">High-Yield Distinction</option>
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
          value={visualRequiredFilter}
          onChange={(e) => setVisualRequiredFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded text-sm"
        >
          <option value="all">All Visuals</option>
          <option value="IMAGE_OCCLUSION">Image Occlusion</option>
          <option value="SCHEMATIC">Schematic</option>
        </select>

        {(cardTypeFilter !== "all" ||
          lessonFilter !== "all" ||
          topicFilter !== "all" ||
          visualRequiredFilter !== "all" ||
          searchQuery) && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Active Filters Summary */}
      {(cardTypeFilter !== "all" ||
        lessonFilter !== "all" ||
        topicFilter !== "all" ||
        visualRequiredFilter !== "all" ||
        searchQuery) && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-600">Active filters:</span>
          {cardTypeFilter !== "all" && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
              Type: {cardTypeFilter.replace(/_/g, " ")}
            </span>
          )}
          {lessonFilter !== "all" && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
              Lesson: {lessons.find((l) => l.id === lessonFilter)?.displayName}
            </span>
          )}
          {topicFilter !== "all" && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
              Topic: {topics.find((t) => t.id === topicFilter)?.displayName}
            </span>
          )}
          {visualRequiredFilter !== "all" && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
              Visual: {visualRequiredFilter.replace(/_/g, " ")}
            </span>
          )}
          {searchQuery && (
            <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded">
              Search: &quot;{searchQuery}&quot;
            </span>
          )}
        </div>
      )}

      {flashcards.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <p className="text-green-800 text-lg font-medium">
            All caught up! No pending flashcards to review.
          </p>
        </div>
      ) : (
        <>
          {/* Bulk Actions Bar */}
          {selectedCards.size > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedCards.size} flashcard{selectedCards.size > 1 ? "s" : ""} selected
                  </span>
                  <button
                    onClick={() => setSelectedCards(new Set())}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    Clear selection
                  </button>
                </div>
                <button
                  onClick={handleBulkApprove}
                  disabled={isBulkApproving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isBulkApproving ? (
                    <>
                      <span className="animate-spin">⚡</span>
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Bulk Approve
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCards.size === flashcards.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-blue-900 font-medium">
                    Select All ({flashcards.length} flashcard{flashcards.length !== 1 ? "s" : ""})
                  </span>
                </label>
              </div>
              <span className="text-blue-700">
                {flashcards.filter((f) => f.visualStatus === "REQUIRED").length}{" "}
                need visual upload
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {flashcards.map((flashcard) => (
              <div
                key={flashcard.id}
                className={`border-2 rounded-lg overflow-hidden transition-colors ${
                  flashcard.visualStatus === "REQUIRED"
                    ? "border-blue-400 bg-blue-50 hover:border-blue-500"
                    : "bg-white border-gray-200 hover:border-blue-300"
                }`}
              >
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 items-center flex-wrap">
                      <input
                        type="checkbox"
                        checked={selectedCards.has(flashcard.id)}
                        onChange={() => toggleSelectCard(flashcard.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {getCardTypeBadge(flashcard.cardType)}
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
                          Pattern: {flashcard.examPattern}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleExpand(flashcard.id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {expandedCard === flashcard.id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    {flashcard.lesson?.name}{" "}
                    {flashcard.topic && `› ${flashcard.topic.name}`}
                  </div>
                </div>

                {/* Preview Card - Mobile Style */}
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-gray-700">
                        Preview
                      </label>
                      <button
                        onClick={() => toggleShowBack(flashcard.id)}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
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
                    </div>

                    <div className="max-w-sm mx-auto">
                      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
                        {/* Front */}
                        <div className="bg-gradient-to-br from-blue-50 to-white p-6 min-h-[180px] flex flex-col items-center justify-center">
                          {flashcard.imageAssetId && (
                            <div className="mb-4 w-full">
                              <img
                                src={`/api/proxy/uploads/visual-assets/${flashcard.imageAssetId}.jpeg`}
                                alt="Visual"
                                className="max-w-full max-h-40 mx-auto rounded-lg object-contain shadow-sm"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <p className="text-center text-lg font-medium text-gray-900">
                            {flashcard.front}
                          </p>
                        </div>

                        {/* Back - Shown when toggled */}
                        {showBack.has(flashcard.id) && (
                          <>
                            <div className="border-t-2 border-dashed border-gray-300"></div>
                            <div className="bg-gradient-to-br from-green-50 to-white p-6 min-h-[180px] flex items-center justify-center">
                              <p className="text-center text-lg text-gray-900">
                                {flashcard.back}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Visual Upload Section - Always visible for REQUIRED */}
                  {flashcard.visualStatus === "REQUIRED" && (
                    <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg space-y-3">
                      <label className="block text-sm font-bold text-yellow-900 mb-2 flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        ⚠️ Visual Upload Required (Approval Blocked)
                      </label>
                      <p className="text-xs text-yellow-800 mb-3">
                        This flashcard requires a visual asset before it can be
                        approved. Upload a new image or bind an existing one.
                      </p>
                      
                      {/* Upload Option */}
                      <div>
                        <p className="text-xs font-semibold text-yellow-900 mb-1">
                          Upload New Image:
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadVisual(flashcard.id, file);
                          }}
                          disabled={uploadingVisual === flashcard.id}
                          className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
                        />
                      </div>

                      {/* Bind Existing Asset Option */}
                      <div>
                        <p className="text-xs font-semibold text-yellow-900 mb-1">
                          Or Bind Existing Asset:
                        </p>
                        <button
                          onClick={() => setShowAssetPicker(flashcard.id)}
                          disabled={uploadingVisual === flashcard.id}
                          className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Select from Library
                        </button>
                      </div>

                      {uploadingVisual === flashcard.id && (
                        <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
                          <span className="animate-spin">⏳</span>
                          Uploading visual...
                        </p>
                      )}
                    </div>
                  )}

                  {/* Expanded Details */}
                  {expandedCard === flashcard.id && (
                    <div className="space-y-4 border-t pt-4">
                      {flashcard.knowledgePoint && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Source Knowledge Point
                          </label>
                          <Link
                            href={`/knowledge-points/${flashcard.knowledgePoint.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {flashcard.knowledgePoint.fact}
                          </Link>
                        </div>
                      )}

                      {flashcard.trapData && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Trap Data
                          </label>
                          <div className="bg-red-50 border border-red-200 rounded p-3">
                            <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                              {JSON.stringify(flashcard.trapData, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/flashcards/${flashcard.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(flashcard.id)}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleReject(flashcard.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(flashcard.id)}
                      disabled={flashcard.visualStatus === "REQUIRED"}
                      className={`px-6 py-2 rounded flex items-center gap-2 ${
                        flashcard.visualStatus === "REQUIRED"
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve & Publish
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Asset Picker Modal */}
      {showAssetPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Select Visual Asset
              </h2>
              <button
                onClick={() => setShowAssetPicker(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="border-b p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search by filename..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => loadImageAssets(assetSearch)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
              </div>
            </div>

            {/* Asset Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingAssets ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500">Loading assets...</p>
                </div>
              ) : imageAssets.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500">No assets found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {imageAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="border rounded-lg p-3 hover:border-blue-500 cursor-pointer transition-colors bg-white"
                      onClick={() =>
                        handleBindAsset(showAssetPicker, asset.id)
                      }
                    >
                      <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL}/${asset.filePath}`}
                          alt={asset.fileName}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-700 truncate font-medium">
                        {asset.fileName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Used in {asset._count?.flashcards} flashcard(s)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
