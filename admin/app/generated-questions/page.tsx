"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import { QuestionList } from "./components/QuestionList";
import { FilterPanel } from "./components/FilterPanel";
import { GeneratedQuestion } from "./components/types";

export default function AdminGeneratedQuestionPage() {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] =
    useState<GeneratedQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">(
    "pending",
  );

  const [advancedFilters, setAdvancedFilters] = useState<{
    lessonId?: string;
    topicId?: string;
    subtopicId?: string;
    sourceType?: string;
    sortBy?: string;
    sortOrder?: string;
  }>({});

  // Bulk selection state
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listGeneratedQuestions({
        status: filter.toUpperCase(),
        ...advancedFilters,
        page,
        limit: pageSize,
      });
      setTotal(result.total);
      setSelectedQuestionIds(new Set());

      if (result.total > 0 && result.questions.length === 0 && page > 1) {
        setPage(Math.max(1, Math.ceil(result.total / pageSize)));
        return;
      }

      setQuestions(result.questions);
      const questionIds = new Set(result.questions.map((item) => item.id));
      if (result.questions.length === 0) {
        setSelectedQuestion(null);
      } else if (!selectedQuestion || !questionIds.has(selectedQuestion.id)) {
        setSelectedQuestion(result.questions[0]);
      }
    } catch (error) {
      console.error("Failed to load questions:", error);
    } finally {
      setLoading(false);
    }
  }, [filter, advancedFilters, selectedQuestion, page, pageSize]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    setPage(1);
  }, [filter, advancedFilters]);

  const handleSelectQuestion = (question: GeneratedQuestion) => {
    setSelectedQuestion(question);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) {
      return;
    }

    try {
      await api.deleteGeneratedQuestion(questionId);
      if (selectedQuestion?.id === questionId) {
        setSelectedQuestion(null);
      }
      await loadQuestions();
    } catch (error) {
      console.error("Failed to delete question:", error);
      alert("Failed to delete question");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestionIds.size === 0) {
      alert("Please select at least one question to delete");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedQuestionIds.size} selected question(s)?`,
      )
    ) {
      return;
    }

    setBulkDeleting(true);
    try {
      const questionIds = Array.from(selectedQuestionIds);
      const result = await api.bulkDeleteGeneratedQuestions(questionIds);

      alert(
        `Bulk delete complete!\nDeleted: ${result.deleted}\nNot Found: ${result.notFound}\nErrors: ${result.errors}`,
      );

      // Clear selection and reload
      setSelectedQuestionIds(new Set());
      await loadQuestions();
    } catch (error) {
      console.error("Failed to bulk delete:", error);
      alert("Failed to delete questions. Please try again.");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleToggleSelection = (questionId: string) => {
    const newSelected = new Set(selectedQuestionIds);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestionIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedQuestionIds.size === questions.length && questions.length > 0) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(questions.map((q) => q.id)));
    }
  };

  const handleFilterChange = (
    nextFilter: "pending" | "approved" | "rejected",
  ) => {
    setFilter(nextFilter);
    setPage(1);
    setSelectedQuestionIds(new Set());
  };

  const handleFiltersChange = (nextFilters: {
    lessonId?: string;
    topicId?: string;
    subtopicId?: string;
    sourceType?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    setAdvancedFilters(nextFilters);
    setPage(1);
    setSelectedQuestionIds(new Set());
  };

  if (loading && questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-full flex flex-col bg-white border-r border-gray-200">
        <FilterPanel
          filters={advancedFilters}
          onFiltersChange={handleFiltersChange}
        />
        <div className="flex-1 overflow-hidden">
          <QuestionList
            questions={questions}
            selectedQuestion={selectedQuestion}
            filter={filter}
            onFilterChange={handleFilterChange}
            onSelectQuestion={handleSelectQuestion}
            handleDeleteQuestion={handleDeleteQuestion}
            selectedQuestionIds={selectedQuestionIds}
            onToggleSelection={handleToggleSelection}
            onSelectAll={handleSelectAll}
            onBulkDelete={handleBulkDelete}
            bulkDeleting={bulkDeleting}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={(nextPage) => {
              const clampedPage = Math.min(
                Math.max(nextPage, 1),
                totalPages,
              );
              setPage(clampedPage);
              setSelectedQuestionIds(new Set());
            }}
          />
        </div>
      </div>
    </div>
  );
}
