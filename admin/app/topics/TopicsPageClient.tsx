"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  BookOpen,
  List,
  Layers,
  Search,
} from "lucide-react";
import { api } from "@/lib/api";
import ValidateTopicDialog from "./ValidateTopicDialog";
import CreateTopicDialog from "./CreateTopicDialog";
import CreateSubtopicDialog from "./CreateSubtopicDialog";
import { set } from "zod";

interface Lesson {
  id: string;
  name: string;
  displayName: string | null;
  questionCount: number;
  knowledgePointCount: number;
}

interface Topic {
  id: string;
  name: string;
  displayName: string | null;
  lessonId: string;
  questionCount: number;
  knowledgePointCount: number;
}

interface Subtopic {
  id: string;
  name: string;
  displayName: string | null;
  topicId: string;
  questionCount: number;
  knowledgePointCount: number;
}

interface TopicsPageClientProps {
  initialLessons: Lesson[];
  initialTopics: Topic[];
  initialSubtopics: Subtopic[];
}

export default function TopicsPageClient({
  initialLessons,
  initialTopics,
  initialSubtopics,
}: TopicsPageClientProps) {
  const router = useRouter();
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(
    new Set(),
  );
  const searchParams = new URLSearchParams(window.location.search);
  const initialSearch = searchParams.get("topic") || "";
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [mergeMode, setMergeMode] = useState<"topic" | "subtopic">("topic");
  const [topicSourceId, setTopicSourceId] = useState("");
  const [topicTargetId, setTopicTargetId] = useState("");
  const [subtopicLessonId, setSubtopicLessonId] = useState("");
  const [subtopicTopicId, setSubtopicTopicId] = useState("");
  const [subtopicSourceId, setSubtopicSourceId] = useState("");
  const [subtopicTargetId, setSubtopicTargetId] = useState("");
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (initialSearch.trim() === "") return;
    setSearchQuery(initialSearch);
  }, [initialSearch, initialLessons, initialTopics, initialSubtopics]);

  const toggleLesson = (lessonId: string) => {
    setExpandedLessons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
        // Also collapse all topics when collapsing lesson
        setExpandedTopics((prevTopics) => {
          const newTopicSet = new Set(prevTopics);
          initialTopics
            .filter((t) => t.lessonId === lessonId)
            .forEach((t) => newTopicSet.delete(t.id));
          return newTopicSet;
        });
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
      }
      return newSet;
    });
  };

  const getTopicsForLesson = (lessonId: string) => {
    return initialTopics.filter((t) => t.lessonId === lessonId);
  };

  const getSubtopicsForTopic = (topicId: string) => {
    return initialSubtopics.filter((st) => st.topicId === topicId);
  };

  const filterBySearch = <
    T extends { name: string; displayName: string | null },
  >(
    items: T[],
    field?: string,
  ) => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();

    //if query matched with topic, return subtopics of that topic

    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        item.displayName?.toLowerCase().includes(query)
      );
    });
  };

  const filteredLessons = filterBySearch(initialLessons);
  const filteredTopics = filterBySearch(initialTopics);
  const filteredSubtopics = filterBySearch(initialSubtopics);

  const getLessonById = (lessonId: string) => {
    return initialLessons.find((l) => l.id === lessonId);
  };

  const getTopicById = (topicId: string) => {
    return initialTopics.find((t) => t.id === topicId);
  };

  const getSubtopicById = (subtopicId: string) => {
    return initialSubtopics.find((st) => st.id === subtopicId);
  };

  const selectedTopicLessonId = topicSourceId
    ? getTopicById(topicSourceId)?.lessonId
    : "";

  const topicTargetOptions = selectedTopicLessonId
    ? initialTopics.filter(
        (topic) =>
          topic.lessonId === selectedTopicLessonId &&
          topic.id !== topicSourceId,
      )
    : initialTopics.filter((topic) => topic.id !== topicSourceId);

  const subtopicTopics = subtopicLessonId
    ? initialTopics.filter((topic) => topic.lessonId === subtopicLessonId)
    : [];

  const subtopicOptions =
    subtopicLessonId && subtopicTopicId
      ? initialSubtopics.filter(
          (subtopic) => subtopic.topicId === subtopicTopicId,
        )
      : [];

  const handleMerge = async () => {
    setMergeError(null);

    if (mergeMode === "topic") {
      if (!topicSourceId || !topicTargetId) {
        setMergeError("Select both source and target topics.");
        return;
      }

      const source = getTopicById(topicSourceId);
      const target = getTopicById(topicTargetId);

      if (!source || !target) {
        setMergeError("Invalid topic selection.");
        return;
      }

      if (source.lessonId !== target.lessonId) {
        setMergeError("Topics must be in the same lesson.");
        return;
      }

      const sourceLesson = getLessonById(source.lessonId);
      const sourceName = source.displayName || source.name;
      const targetName = target.displayName || target.name;
      const lessonName =
        sourceLesson?.displayName || sourceLesson?.name || "Unknown";

      if (
        !window.confirm(
          `Merge "${sourceName}" into "${targetName}" under lesson "${lessonName}"? This cannot be undone.`,
        )
      ) {
        return;
      }

      setIsMerging(true);
      try {
        await api.mergeTopics({
          lessonId: source.lessonId,
          sourceTopicId: source.id,
          targetTopicId: target.id,
        });
        router.refresh();
      } catch (error) {
        setMergeError(
          error instanceof Error ? error.message : "Failed to merge topics",
        );
      } finally {
        setIsMerging(false);
      }
      return;
    }

    if (
      !subtopicLessonId ||
      !subtopicTopicId ||
      !subtopicSourceId ||
      !subtopicTargetId
    ) {
      setMergeError(
        "Select lesson, topic, source subtopic, and target subtopic.",
      );
      return;
    }

    const source = getSubtopicById(subtopicSourceId);
    const target = getSubtopicById(subtopicTargetId);
    const topic = getTopicById(subtopicTopicId);
    const lesson = getLessonById(subtopicLessonId);

    if (!source || !target || !topic || !lesson) {
      setMergeError("Invalid subtopic selection.");
      return;
    }

    const sourceName = source.displayName || source.name;
    const targetName = target.displayName || target.name;
    const topicName = topic.displayName || topic.name;
    const lessonName = lesson.displayName || lesson.name;

    if (
      !window.confirm(
        `Merge "${sourceName}" into "${targetName}" under ${lessonName} / ${topicName}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setIsMerging(true);
    try {
      await api.mergeSubtopics({
        lessonId: subtopicLessonId,
        topicId: subtopicTopicId,
        sourceSubtopicId: subtopicSourceId,
        targetSubtopicId: subtopicTargetId,
      });
      router.refresh();
    } catch (error) {
      setMergeError(
        error instanceof Error ? error.message : "Failed to merge subtopics",
      );
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            Lesson, Topic & Subtopic Registry
          </h1>
          <p className="mt-2 text-gray-600">
            Hierarchical view of lessons, topics, and subtopics with statistics
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search topics and subtopics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mb-8 bg-white rounded-lg shadow-md border border-gray-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Topic Management
              </h2>
              <p className="text-sm text-gray-600">
                Create, validate, or merge topics and subtopics.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <CreateTopicDialog lessons={initialLessons} />
              <CreateSubtopicDialog
                lessons={initialLessons}
                topics={initialTopics}
              />
              <ValidateTopicDialog
                lessons={initialLessons}
                topics={initialTopics}
              />
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Merge type</label>
                <select
                  value={mergeMode}
                  onChange={(event) => {
                    setMergeMode(event.target.value as "topic" | "subtopic");
                    setMergeError(null);
                  }}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm"
                >
                  <option value="topic">Topic</option>
                  <option value="subtopic">Subtopic</option>
                </select>
              </div>
            </div>
          </div>

          {mergeMode === "topic" ? (
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Source topic
                </label>
                <select
                  value={topicSourceId}
                  onChange={(event) => {
                    setTopicSourceId(event.target.value);
                    setTopicTargetId("");
                    setMergeError(null);
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select source</option>
                  {initialTopics.map((topic) => {
                    const lesson = getLessonById(topic.lessonId);
                    const lessonName =
                      lesson?.displayName || lesson?.name || "Unknown";
                    return (
                      <option key={topic.id} value={topic.id}>
                        {topic.displayName || topic.name} ({lessonName})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Target topic
                </label>
                <select
                  value={topicTargetId}
                  onChange={(event) => {
                    setTopicTargetId(event.target.value);
                    setMergeError(null);
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  disabled={!topicSourceId}
                >
                  <option value="">Select target</option>
                  {topicTargetOptions.map((topic) => {
                    const lesson = getLessonById(topic.lessonId);
                    const lessonName =
                      lesson?.displayName || lesson?.name || "Unknown";
                    return (
                      <option key={topic.id} value={topic.id}>
                        {topic.displayName || topic.name} ({lessonName})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleMerge}
                  disabled={isMerging || !topicSourceId || !topicTargetId}
                  className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isMerging ? "Merging..." : "Merge Topics"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Lesson
                </label>
                <select
                  value={subtopicLessonId}
                  onChange={(event) => {
                    setSubtopicLessonId(event.target.value);
                    setSubtopicTopicId("");
                    setSubtopicSourceId("");
                    setSubtopicTargetId("");
                    setMergeError(null);
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select lesson</option>
                  {initialLessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.displayName || lesson.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Topic
                </label>
                <select
                  value={subtopicTopicId}
                  onChange={(event) => {
                    setSubtopicTopicId(event.target.value);
                    setSubtopicSourceId("");
                    setSubtopicTargetId("");
                    setMergeError(null);
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  disabled={!subtopicLessonId}
                >
                  <option value="">Select topic</option>
                  {subtopicTopics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.displayName || topic.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Source subtopic
                </label>
                <select
                  value={subtopicSourceId}
                  onChange={(event) => {
                    setSubtopicSourceId(event.target.value);
                    setSubtopicTargetId("");
                    setMergeError(null);
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  disabled={!subtopicTopicId}
                >
                  <option value="">Select source</option>
                  {subtopicOptions.map((subtopic) => (
                    <option key={subtopic.id} value={subtopic.id}>
                      {subtopic.displayName || subtopic.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Target subtopic
                </label>
                <select
                  value={subtopicTargetId}
                  onChange={(event) => {
                    setSubtopicTargetId(event.target.value);
                    setMergeError(null);
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  disabled={!subtopicSourceId}
                >
                  <option value="">Select target</option>
                  {subtopicOptions
                    .filter((subtopic) => subtopic.id !== subtopicSourceId)
                    .map((subtopic) => (
                      <option key={subtopic.id} value={subtopic.id}>
                        {subtopic.displayName || subtopic.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-4">
                <button
                  type="button"
                  onClick={handleMerge}
                  disabled={
                    isMerging ||
                    !subtopicLessonId ||
                    !subtopicTopicId ||
                    !subtopicSourceId ||
                    !subtopicTargetId
                  }
                  className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isMerging ? "Merging..." : "Merge Subtopics"}
                </button>
              </div>
            </div>
          )}

          {mergeError && (
            <p className="mt-3 text-sm text-red-600">{mergeError}</p>
          )}
        </div>

        {initialLessons.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No lessons found</p>
            <p className="text-sm text-gray-500">
              Lessons will appear here once exam questions are analyzed
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {initialLessons.map((lesson) => {
              const lessonTopics = getTopicsForLesson(lesson.id);

              // Filter topics based on search
              const visibleTopics = searchQuery
                ? lessonTopics.filter(
                    (t) =>
                      filteredTopics.some((ft) => ft.id === t.id) ||
                      getSubtopicsForTopic(t.id).some((st) =>
                        filteredSubtopics.some((fs) => fs.id === st.id),
                      ),
                  )
                : lessonTopics;

              // Hide lesson if no topics match search
              if (searchQuery && visibleTopics.length === 0) return null;

              const isLessonExpanded = expandedLessons.has(lesson.id);

              return (
                <div
                  key={lesson.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
                >
                  {/* LESSON HEADER */}
                  <div
                    className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleLesson(lesson.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isLessonExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        )}
                        <BookOpen className="w-6 h-6 text-blue-600" />
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">
                            {lesson.displayName || lesson.name}
                          </h2>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-gray-600">
                              {visibleTopics.length} topics
                            </span>
                            <span className="text-sm text-gray-400">•</span>
                            <span className="text-sm text-gray-600">
                              {lesson.questionCount} questions
                            </span>
                            <span className="text-sm text-gray-400">•</span>
                            <span className="text-sm text-gray-600">
                              {lesson.knowledgePointCount} knowledge points
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TOPICS */}
                  {isLessonExpanded && visibleTopics.length > 0 && (
                    <div className="bg-gray-50 border-t border-gray-200">
                      {visibleTopics.map((topic) => {
                        const isTopicExpanded = expandedTopics.has(topic.id);
                        const topicSubtopics = getSubtopicsForTopic(topic.id);

                        // Filter subtopics based on search
                        const visibleSubtopics = searchQuery
                          ? topicSubtopics.filter((st) =>
                              filteredSubtopics.some((fs) => fs.id === st.id),
                            )
                          : topicSubtopics;

                        return (
                          <div
                            key={topic.id}
                            className="border-b border-gray-200 last:border-b-0"
                          >
                            {/* TOPIC HEADER */}
                            <div
                              className="p-4 pl-12 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between"
                              onClick={() => toggleTopic(topic.id)}
                            >
                              <div className="flex items-center gap-3">
                                {isTopicExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-600" />
                                )}
                                <List className="w-5 h-5 text-green-600" />
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-800">
                                    {topic.displayName || topic.name}
                                  </h3>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-gray-600">
                                      {visibleSubtopics.length} subtopics
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      •
                                    </span>
                                    <span className="text-xs text-gray-600">
                                      {topic.questionCount} questions
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      •
                                    </span>
                                    <span className="text-xs text-gray-600">
                                      {topic.knowledgePointCount} knowledge
                                      points
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* SUBTOPICS */}
                            {isTopicExpanded && visibleSubtopics.length > 0 && (
                              <div className="bg-white">
                                {visibleSubtopics.map((subtopic) => {
                                  const lesson = getLessonById(topic.lessonId);
                                  return (
                                    <Link
                                      key={subtopic.id}
                                      href={`/topics/${subtopic.id}`}
                                      className="block p-3 pl-20 border-t border-gray-100 hover:bg-blue-50 transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Layers className="w-4 h-4 text-purple-600" />
                                        <div className="flex-1">
                                          <h4 className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                                            {subtopic.displayName ||
                                              subtopic.name}
                                          </h4>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-600">
                                              {subtopic.questionCount} questions
                                            </span>
                                            {subtopic.knowledgePointCount !==
                                              undefined && (
                                              <>
                                                <span className="text-xs text-gray-400">
                                                  •
                                                </span>
                                                <span className="text-xs text-gray-600">
                                                  {subtopic.knowledgePointCount}{" "}
                                                  knowledge points
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}

                            {isTopicExpanded && topicSubtopics.length === 0 && (
                              <div className="p-4 pl-20 bg-white text-sm text-gray-500 italic">
                                No subtopics yet
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isLessonExpanded && lessonTopics.length === 0 && (
                    <div className="p-6 bg-gray-50 text-center text-sm text-gray-500 italic border-t border-gray-200">
                      No topics yet for this lesson
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
