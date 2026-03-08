/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/api";
import { AlertCircle, CheckCircle, XCircle, Plus } from "lucide-react";
import OntologyResolutionModal from "./OntologyResolutionModal";

interface UnmatchedQuestion {
  id: string;
  year: number;
  examType: string | null;
  questionNumber: number | null;
  question: string;
  lesson: { name: string; id: string } | null;
  unmatchedTopic: string | null;
  unmatchedSubtopic: string | null;
  unmatchedConcepts: string[];
  topicId: string | null;
  subtopicId: string | null;
  createdAt: string;
  topic: { name: string } | null;
  subtopic: { name: string } | null;
}

interface UnmatchedSuggestions {
  topics: Array<{ name: string; lesson: string; count: number }>;
  subtopics: Array<{ name: string; lesson: string; count: number }>;
  concepts: Array<{ name: string; lesson: string; count: number }>;
}

export default function OntologyReviewView() {
  const [questions, setQuestions] = useState<UnmatchedQuestion[]>([]);
  const [suggestions, setSuggestions] = useState<UnmatchedSuggestions | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [minOccurrences] = useState(2);
  const [activeTab, setActiveTab] = useState<"questions" | "suggestions">(
    "questions",
  );
  const [selectedQuestion, setSelectedQuestion] =
    useState<UnmatchedQuestion | null>(null);

  // Bulk selection state
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkAction, setBulkAction] = useState<
    "APPROVE_AS_IS" | "REJECT_SUGGESTIONS" | null
  >(null);

  // Bulk selection state

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [questionsRes, suggestionsRes] = await Promise.all([
        api.getQuestionsNeedingReview(selectedLesson || undefined),
        api.getUnmatchedOntologySuggestions({
          lesson: selectedLesson || undefined,
          minOccurrences,
        }),
      ]);
      setQuestions(questionsRes.questions || []);
      setSuggestions(suggestionsRes.suggestions);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedLesson, minOccurrences]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resolveQuestion = async (
    questionId: string,
    action: "APPROVE_AS_IS" | "REJECT_SUGGESTIONS" | "RESOLVE",
    data?: { topicId?: string; subtopicId?: string; conceptIds?: string[] },
  ) => {
    try {
      await api.resolveOntologyMismatches(questionId, {
        action,
        ...data,
      });
      await loadData();
    } catch (error) {
      console.error("Failed to resolve:", error);
      alert("Failed to resolve question");
    }
  };

  const createEntity = async (
    entityType: "TOPIC" | "SUBTOPIC" | "CONCEPT",
    name: string,
    lessonId?: string,
    topicId?: string,
    subtopicId?: string,
  ) => {
    try {
      if (!lessonId) {
        alert("Lesson ID is required");
        return;
      }

      await api.createOntologyEntity({
        name,
        entityType,
        lessonId,
        topicId,
        subtopicId,
      });
      await loadData();
      alert(`${entityType} created successfully`);
    } catch (error) {
      console.error("Failed to create entity:", error);
      alert(`Failed to create ${entityType}`);
    }
  };

  const toggleQuestionSelection = (questionId: string) => {
    const newSelection = new Set(selectedQuestionIds);
    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }
    setSelectedQuestionIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedQuestionIds.size === questions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(questions.map((q) => q.id)));
    }
  };

  const handleBulkAction = async (
    action: "APPROVE_AS_IS" | "REJECT_SUGGESTIONS",
  ) => {
    if (selectedQuestionIds.size === 0) return;

    const actionText = action === "APPROVE_AS_IS" ? "approve" : "reject";
    if (
      !confirm(
        `Are you sure you want to ${actionText} ${selectedQuestionIds.size} questions?`,
      )
    ) {
      return;
    }
    console.log(action);

    try {
      const response = await api.bulkResolveOntology({
        questionIds: Array.from(selectedQuestionIds),
        action,
      });

      alert(
        `Bulk ${actionText} completed:\n` +
          `✅ Success: ${response.success}\n` +
          `❌ Failed: ${response.failed}\n` +
          (response.errors.length > 0
            ? `\nErrors: ${response.errors.map((e: any) => e.error).join(", ")}`
            : ""),
      );

      setSelectedQuestionIds(new Set());
      await loadData();
    } catch (error: any) {
      console.error("Failed to bulk resolve:", error);
      alert(`Error: ${error.message || "Failed to bulk resolve"}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ontology review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ontology Review</h1>
          <p className="text-gray-600 mt-1">
            Review and resolve unmatched ontology suggestions from AI analysis
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedLesson}
            onChange={(e) => setSelectedLesson(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Lessons</option>
            <option value="Anatomi">Anatomi</option>
            <option value="Dahiliye">Dahiliye</option>
            <option value="Pediatri">Pediatri</option>
            <option value="Nöroloji">Nöroloji</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">
                Questions Needing Review
              </p>
              <p className="text-3xl font-bold text-orange-700 mt-1">
                {questions.length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">
                Unmatched Topics
              </p>
              <p className="text-3xl font-bold text-blue-700 mt-1">
                {suggestions?.topics.length || 0}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">
                Unmatched Subtopics
              </p>
              <p className="text-3xl font-bold text-purple-700 mt-1">
                {suggestions?.subtopics.length || 0}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-pink-600 font-medium">
                Unmatched Concepts
              </p>
              <p className="text-3xl font-bold text-pink-700 mt-1">
                {suggestions?.concepts.length || 0}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-pink-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("questions")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "questions"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Questions ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab("suggestions")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "suggestions"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Aggregated Suggestions
          </button>
        </nav>
      </div>

      {/* Bulk Actions Bar */}
      {activeTab === "questions" && selectedQuestionIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <span className="text-blue-900 font-medium">
              {selectedQuestionIds.size} question
              {selectedQuestionIds.size > 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction("APPROVE_AS_IS")}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Approve All As-Is
            </button>
            <button
              onClick={() => handleBulkAction("REJECT_SUGGESTIONS")}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Reject All
            </button>
            <button
              onClick={() => setSelectedQuestionIds(new Set())}
              className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === "questions" ? (
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">All Clear!</h3>
              <p className="text-gray-600 mt-2">
                No questions need ontology review at the moment.
              </p>
            </div>
          ) : (
            <>
              {/* Select All Checkbox */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  checked={
                    selectedQuestionIds.size === questions.length &&
                    questions.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Select All ({questions.length} questions)
                </label>
              </div>

              {questions.map((q) => (
                <div
                  key={q.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
                >
                  {/* Checkbox + Question Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <input
                      type="checkbox"
                      checked={selectedQuestionIds.has(q.id)}
                      onChange={() => toggleQuestionSelection(q.id)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          {q.year} {q.examType} #{q.questionNumber}
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className="text-sm text-gray-700 font-medium">
                          {q.lesson ? q.lesson.name : "No Lesson"}
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className="text-sm text-gray-700 font-medium">
                          {q.topic ? q.topic.name : "No Topic"}
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className="text-sm text-gray-700 font-medium">
                          {q.subtopic ? q.subtopic.name : "No Subtopic"}
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium line-clamp-2">
                        {q.question}
                      </p>
                    </div>
                  </div>

                  {/* Unmatched Fields */}
                  <div className="space-y-3 mb-4">
                    {q.unmatchedTopic && (
                      <div className="flex items-start gap-2 bg-orange-50 p-3 rounded">
                        <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-orange-900">
                            Unmatched Topic
                          </p>
                          <p className="text-sm text-orange-700 mt-1">
                            {q.unmatchedTopic}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const name = prompt(
                              "Create new topic:",
                              q.unmatchedTopic || "",
                            );
                            if (name)
                              createEntity(
                                "TOPIC",
                                name,
                                q.lesson?.id || undefined,
                              );
                          }}
                          className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
                        >
                          <Plus className="w-3 h-3 inline mr-1" />
                          Create
                        </button>
                      </div>
                    )}

                    {q.unmatchedSubtopic && (
                      <div className="flex items-start gap-2 bg-purple-50 p-3 rounded">
                        <AlertCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-purple-900">
                            Unmatched Subtopic
                          </p>
                          <p className="text-sm text-purple-700 mt-1">
                            {q.unmatchedSubtopic}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (!q.topicId) {
                              alert("Please resolve topic first");
                              return;
                            }
                            const name = prompt(
                              "Create new subtopic:",
                              q.unmatchedSubtopic || "",
                            );
                            if (name)
                              createEntity(
                                "SUBTOPIC",
                                name,
                                undefined,
                                q.topicId,
                              );
                          }}
                          className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                        >
                          <Plus className="w-3 h-3 inline mr-1" />
                          Create
                        </button>
                      </div>
                    )}

                    {q.unmatchedConcepts.length > 0 && (
                      <div className="flex items-start gap-2 bg-pink-50 p-3 rounded">
                        <AlertCircle className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-pink-900">
                            Unmatched Concepts
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {q.unmatchedConcepts.map((concept, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded"
                              >
                                {concept}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const name = prompt("Create new concept:");
                            if (name) createEntity("CONCEPT", name);
                          }}
                          className="px-3 py-1 bg-pink-600 text-white text-xs rounded hover:bg-pink-700"
                        >
                          <Plus className="w-3 h-3 inline mr-1" />
                          Create
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <button
                      onClick={() => setSelectedQuestion(q)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                    >
                      🧠 Resolve Ontology
                    </button>
                    <a
                      href={`/exam-questions/${q.id}`}
                      className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700"
                    >
                      View Details
                    </a>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Topics */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Unmatched Topics ({suggestions?.topics.length || 0})
            </h3>
            <div className="space-y-2">
              {suggestions?.topics.slice(0, 10).map((topic, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {topic.name}
                    </p>
                    <p className="text-xs text-gray-500">{topic.lesson}</p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                    {topic.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Subtopics */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Unmatched Subtopics ({suggestions?.subtopics.length || 0})
            </h3>
            <div className="space-y-2">
              {suggestions?.subtopics.slice(0, 10).map((subtopic, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {subtopic.name}
                    </p>
                    <p className="text-xs text-gray-500">{subtopic.lesson}</p>
                  </div>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                    {subtopic.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Concepts */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Unmatched Concepts ({suggestions?.concepts.length || 0})
            </h3>
            <div className="space-y-2">
              {suggestions?.concepts.slice(0, 10).map((concept, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {concept.name}
                    </p>
                    <p className="text-xs text-gray-500">{concept.lesson}</p>
                  </div>
                  <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs font-bold rounded">
                    {concept.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      {selectedQuestion ? (
        <OntologyResolutionModal
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          onResolved={() => {
            setSelectedQuestion(null);
            loadData();
          }}
        />
      ) : null}
    </div>
  );
}
