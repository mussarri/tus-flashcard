/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";
import { api } from "../../../lib/api";

interface FilterPanelProps {
  filters: {
    lessonId?: string;
    topicId?: string;
    subtopicId?: string;
    sourceType?: string;
    sortBy?: string;
    sortOrder?: string;
  };
  onFiltersChange: (filters: any) => void;
}

interface Lesson {
  id: string;
  name: string;
  displayName: string;
}

interface Topic {
  id: string;
  name: string;
}

interface Subtopic {
  id: string;
  name: string;
}

export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLessons = async () => {
    try {
      const result = await api.getTopics();
      setLessons(result.lessons);
    } catch (error) {
      console.error("Failed to load lessons:", error);
    }
  };

  const loadTopics = async (lessonId: string) => {
    try {
      const result = await api.getTopics({ lessonId });
      setTopics(result.topics);
    } catch (error) {
      console.error("Failed to load topics:", error);
    }
  };

  const loadSubtopics = async (topicId: string) => {
    try {
      const result = await api.getTopics({ topicId });
      setSubtopics(result.subtopics);
    } catch (error) {
      console.error("Failed to load subtopics:", error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters };

    if (value === "") {
      delete newFilters[key as keyof typeof filters];

      // Clear dependent filters
      if (key === "lessonId") {
        delete newFilters.topicId;
        delete newFilters.subtopicId;
      } else if (key === "topicId") {
        delete newFilters.subtopicId;
      }
    } else {
      newFilters[key as keyof typeof filters] = value;
    }

    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  useEffect(() => {
    loadLessons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (filters.lessonId) {
      loadTopics(filters.lessonId);
    } else {
      setTopics([]);
      setSubtopics([]);
    }
  }, [filters.lessonId]);

  useEffect(() => {
    if (filters.topicId) {
      loadSubtopics(filters.topicId);
    } else {
      setSubtopics([]);
    }
  }, [filters.topicId]);

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="w=full bg-white border-b border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="ml-auto text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3 mb-3">
        {/* Source Type Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Question Source
          </label>
          <select
            value={filters.sourceType || ""}
            onChange={(e) => handleFilterChange("sourceType", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Sources</option>
            <option value="EXAM_REPLICA">🟡 Exam Replica</option>
            <option value="AI_GENERATION">🤖 AI Generated</option>
            <option value="ADMIN">👤 Admin Created</option>
            <option value="ERROR_BASED">❌ Error Based</option>
          </select>
        </div>

        {/* Lesson Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Lesson
          </label>
          <select
            value={filters.lessonId || ""}
            onChange={(e) => handleFilterChange("lessonId", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Lessons</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Topic Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Topic
          </label>
          <select
            value={filters.topicId || ""}
            onChange={(e) => handleFilterChange("topicId", e.target.value)}
            disabled={!filters.lessonId || topics.length === 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">All Topics</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subtopic Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Subtopic
          </label>
          <select
            value={filters.subtopicId || ""}
            onChange={(e) => handleFilterChange("subtopicId", e.target.value)}
            disabled={!filters.topicId || subtopics.length === 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">All Subtopics</option>
            {subtopics.map((subtopic) => (
              <option key={subtopic.id} value={subtopic.id}>
                {subtopic.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sorting Row */}
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            value={filters.sortBy || "createdAt"}
            onChange={(e) => handleFilterChange("sortBy", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="createdAt">Created Date</option>
            <option value="updatedAt">Updated Date</option>
            <option value="approvalStatus">Approval Status</option>
            <option value="sourceType">Source Type</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Order
          </label>
          <select
            value={filters.sortOrder || "desc"}
            onChange={(e) => handleFilterChange("sortOrder", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {filters.sourceType && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                Source: {filters.sourceType}
                <button
                  onClick={() => handleFilterChange("sourceType", "")}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.lessonId && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                Lesson
                <button
                  onClick={() => handleFilterChange("lessonId", "")}
                  className="hover:bg-green-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.topicId && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                Topic
                <button
                  onClick={() => handleFilterChange("topicId", "")}
                  className="hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.subtopicId && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                Subtopic
                <button
                  onClick={() => handleFilterChange("subtopicId", "")}
                  className="hover:bg-orange-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(filters.sortBy && filters.sortBy !== "createdAt") && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                Sort: {filters.sortBy}
                <button
                  onClick={() => handleFilterChange("sortBy", "")}
                  className="hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(filters.sortOrder && filters.sortOrder !== "desc") && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                Order: {filters.sortOrder === "asc" ? "Oldest First" : "Newest First"}
                <button
                  onClick={() => handleFilterChange("sortOrder", "")}
                  className="hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
