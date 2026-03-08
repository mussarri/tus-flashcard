"use client";

import {
  BookOpen,
  BarChart3,
  AlertTriangle,
  Edit,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface AdminMetadataPanelProps {
  questionCard: {
    id: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    patternType: string | null;
    sourceExamQuestionId: string | null;
    sourceType: string;
    lesson: { id: string; name: string };
    topic: { id: string; name: string } | null;
    subtopic: { id: string; name: string } | null;
    timesShown: number;
    correctRate: number | null;
    approvalStatus: string;
  };
  hasBeenSolved: boolean;
  isCorrect: boolean | null;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
}

export function AdminMetadataPanel({
  questionCard,
  hasBeenSolved,
  isCorrect,
  onApprove,
  onReject,
  onEdit,
}: AdminMetadataPanelProps) {
  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      EASY: "bg-green-100 text-green-800",
      MEDIUM: "bg-yellow-100 text-yellow-800",
      HARD: "bg-red-100 text-red-800",
    };
    return colors[difficulty] || colors.MEDIUM;
  };

  const isPending = questionCard.approvalStatus === "PENDING";

  return (
    <div className="space-y-4">
      {/* Metadata Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Question Metadata
        </h3>

        <div className="space-y-3 text-sm">
          <div>
            <span className="text-gray-600">Difficulty:</span>
            <span
              className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${getDifficultyColor(
                questionCard.difficulty,
              )}`}
            >
              {questionCard.difficulty}
            </span>
          </div>

          {questionCard.patternType && (
            <div>
              <span className="text-gray-600">Pattern Type:</span>
              <span className="ml-2 text-gray-900 font-medium">
                {questionCard.patternType}
              </span>
            </div>
          )}

          <div>
            <span className="text-gray-600">Source Type:</span>
            <span
              className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                questionCard.sourceType === "EXAM_REPLICA"
                  ? "bg-amber-100 text-amber-800"
                  : questionCard.sourceType === "AI_GENERATION"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {questionCard.sourceType}
            </span>
          </div>

          {questionCard.sourceExamQuestionId && (
            <div>
              <span className="text-gray-600">Source Exam:</span>
              <a
                href={`/exam-questions/${questionCard.sourceExamQuestionId}`}
                className="ml-2 text-blue-600 hover:underline text-xs"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Exam Question →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Taxonomy Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900 mb-4">Taxonomy</h3>

        <div className="space-y-2 text-sm">
          <div>
            <span className="text-gray-600">Lesson:</span>
            <span className="ml-2 text-gray-900 font-medium">
              {questionCard.lesson.name}
            </span>
          </div>

          {questionCard.topic && (
            <div>
              <span className="text-gray-600">Topic:</span>
              <span className="ml-2 text-gray-900 font-medium">
                {questionCard.topic.name}
              </span>
            </div>
          )}

          {questionCard.subtopic && (
            <div>
              <span className="text-gray-600">Subtopic:</span>
              <span className="ml-2 text-gray-900 font-medium">
                {questionCard.subtopic.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Analytics
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Times Shown:</span>
            <span className="text-gray-900 font-bold text-lg">
              {questionCard.timesShown}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Correct Rate:</span>
            <span className="text-gray-900 font-bold text-lg">
              {questionCard.correctRate !== null
                ? `${(questionCard.correctRate * 100).toFixed(1)}%`
                : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900 mb-4">Admin Actions</h3>

        {!hasBeenSolved ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900 mb-1">
                  Solve Required
                </p>
                <p className="text-xs text-amber-700">
                  Please solve the question before approving. This ensures
                  you&apos;ve reviewed the content as students will experience
                  it.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Solve Result */}
            <div
              className={`p-3 rounded-lg border ${
                isCorrect
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <p className="text-sm font-semibold">
                {isCorrect
                  ? "✅ You answered correctly"
                  : "❌ You answered incorrectly"}
              </p>
            </div>

            {/* Edit Button */}
            <button
              onClick={onEdit}
              className="w-full py-2 px-4 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Explanations
            </button>

            {/* Approve Button */}
            {isPending && (
              <button
                onClick={onApprove}
                className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Approve Question
              </button>
            )}

            {/* Reject Button */}
            {isPending && (
              <button
                onClick={onReject}
                className="w-full py-2 px-4 bg-white border-2 border-red-300 text-red-700 rounded-lg font-semibold hover:bg-red-50 hover:border-red-400 transition-all flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject Question
              </button>
            )}

            {!isPending && (
              <div className="text-sm text-gray-600 text-center py-2">
                Question is already{" "}
                <span className="font-semibold">
                  {questionCard.approvalStatus}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
