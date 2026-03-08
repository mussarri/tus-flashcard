"use client";

import { FileQuestion, BookOpen, Eye, Trash2Icon, CheckSquare, Square, Loader2 } from "lucide-react";
import { GeneratedQuestion } from "./types";
import Link from "next/link";

interface QuestionListProps {
  questions: GeneratedQuestion[];
  selectedQuestion: GeneratedQuestion | null;
  filter: "pending" | "approved" | "rejected";
  onFilterChange: (filter: "pending" | "approved" | "rejected") => void;
  onSelectQuestion: (question: GeneratedQuestion) => void;
  handleDeleteQuestion: (questionId: string) => void;
  selectedQuestionIds: Set<string>;
  onToggleSelection: (questionId: string) => void;
  onSelectAll: () => void;
  onBulkDelete: () => void;
  bulkDeleting: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function QuestionList({
  questions,
  selectedQuestion,
  filter,
  onFilterChange,
  onSelectQuestion,
  handleDeleteQuestion,
  selectedQuestionIds,
  onToggleSelection,
  onSelectAll,
  onBulkDelete,
  bulkDeleting,
  total,
  page,
  pageSize,
  onPageChange,
}: QuestionListProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPagination = total > pageSize;
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  const getDifficultyBadge = (difficulty?: string) => {
    const config: Record<string, { color: string; label: string }> = {
      EASY: { color: "bg-green-100 text-green-700", label: "Easy" },
      MEDIUM: { color: "bg-yellow-100 text-yellow-700", label: "Medium" },
      HARD: { color: "bg-red-100 text-red-700", label: "Hard" },
    };
    const c = config[difficulty || "MEDIUM"] || config.MEDIUM;
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${c.color}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 shrink-0">
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FileQuestion className="w-5 h-5" />
          Questions
        </h1>

        {/* Filter Tabs */}
        <div className="flex gap-1 mt-3">
          <button
            onClick={() => onFilterChange("pending")}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded ${
              filter === "pending"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => onFilterChange("approved")}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded ${
              filter === "approved"
                ? "bg-green-100 text-green-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => onFilterChange("rejected")}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded ${
              filter === "rejected"
                ? "bg-red-100 text-red-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedQuestionIds.size > 0 && (
        <div className="bg-red-50 border-b border-red-200 p-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-900">
              {selectedQuestionIds.size} question{selectedQuestionIds.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => onToggleSelection('')}
              className="text-xs text-red-600 hover:text-red-800 underline"
            >
              Clear selection
            </button>
          </div>
          <button
            onClick={onBulkDelete}
            disabled={bulkDeleting}
            className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2Icon className="w-4 h-4" />
                Delete Selected ({selectedQuestionIds.size})
              </>
            )}
          </button>
        </div>
      )}

      {/* Select All Bar */}
      {questions.length > 0 && (
        <div className="bg-gray-50 border-b border-gray-200 p-2 flex items-center gap-2 shrink-0">
          <button
            onClick={onSelectAll}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
          >
            {selectedQuestionIds.size === questions.length && questions.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>Select All ({questions.length})</span>
          </button>
        </div>
      )}

      {/* Question List */}
      <div className="flex-1 overflow-y-auto">
        {questions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileQuestion className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No {filter} questions</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {questions.map((question) => (
              <div
                key={question.id}
                className={`relative group transition-colors ${
                  selectedQuestion?.id === question.id
                    ? "bg-blue-50 border-l-4 border-l-blue-600"
                    : "hover:bg-gray-50 border-l-4 border-l-transparent"
                }`}
              >
                <div className="flex items-start">
                  {/* Checkbox */}
                  <div className="p-4 flex items-start">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelection(question.id);
                      }}
                      className="mt-1"
                    >
                      {selectedQuestionIds.has(question.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>

                  {/* Question Content */}
                  <button
                    onClick={() => onSelectQuestion(question)}
                    className="flex-1 p-4 pl-0 text-left"
                  >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {getDifficultyBadge(question.difficulty)}
                      <span className="text-xs text-gray-500">
                        {new Date(question.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {/* Delete  Button */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuestion(question.id);
                        }}
                        className="cursor-pointer transition-opacity px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                      >
                        <Trash2Icon className="w-3 h-3" />
                        Delete
                      </div>

                      {/* Review Button */}
                      <Link
                        href={`/generated-questions/${question.id}`}
                        className=" transition-opacity px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Eye className="w-3 h-3" />
                        Review
                      </Link>
                    </div>
                  </div>

                  <p className="text-sm text-gray-900 line-clamp-2 mb-2">
                    {question.question}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <BookOpen className="w-3 h-3" />
                    <span className="truncate">
                      {question.topic?.name || "No topic"}
                    </span>
                  </div>
                </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hasPagination && (
        <div className="border-t border-gray-200 p-3 flex items-center justify-between text-sm text-gray-600 shrink-0">
          <div>
            Showing {startIndex}-{endIndex} of {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
