/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "../../../lib/api";
import { QuestionSolveView } from "./components/QuestionSolveView";
import { AdminMetadataPanel } from "./components/AdminMetadataPanel";
import { EditExplanationsModal } from "./components/EditExplanationsModal";
import Link from "next/link";

interface QuestionCard {
  id: string;
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  mainExplanation: string | null;
  optionsMetadata: Record<string, any> | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  patternType: string | null;
  clinicalCorrelation: string | null;
  spatialContexts?: Array<{ concept: { preferredLabel: string } }>;
  sourceType: "ADMIN" | "EXAM_REPLICA" | "AI_GENERATION" | "ERROR_BASED";
  sourceExamQuestionId: string | null;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  lesson: { id: string; name: string };
  topic: { id: string; name: string } | null;
  subtopic: { id: string; name: string } | null;
  timesShown: number;
  correctRate: number | null;
  createdAt: string;
}

type SolveState = "UNSOLVED" | "SELECTED" | "ANSWERED" | "EDITING";

interface SolveResult {
  isCorrect: boolean;
  selectedOption: string;
  correctAnswer: string;
}

export default function QuestionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [questionCard, setQuestionCard] = useState<QuestionCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Solve state
  const [solveState, setSolveState] = useState<SolveState>("UNSOLVED");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [hasBeenSolved, setHasBeenSolved] = useState(false);

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadQuestion();
  }, [id]);

  const loadQuestion = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getGeneratedQuestion(id);
      setQuestionCard(result.question);
    } catch (err) {
      console.error("Failed to load question:", err);
      setError("Failed to load question");
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (solveState === "ANSWERED") return; // Can't change after submit
    setSelectedOption(option);
    setSolveState("SELECTED");
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption || !questionCard) return;

    const correct = selectedOption === questionCard.correctAnswer;
    setIsCorrect(correct);
    setSolveState("ANSWERED");
    setHasBeenSolved(true);
  };

  const handleApprove = async () => {
    if (!hasBeenSolved) {
      alert("⚠️ Please solve the question before approving.");
      return;
    }

    const confirmed = confirm(
      `You ${isCorrect ? "correctly" : "incorrectly"} answered this question.\n\nAre you sure you want to approve it?`,
    );

    if (!confirmed) return;

    try {
      await api.approveGeneratedQuestion(id);
      alert("✅ Question approved!");
      router.push("/generated-questions");
    } catch (err) {
      console.error("Failed to approve:", err);
      alert("Failed to approve question");
    }
  };

  const handleReject = async () => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;

    try {
      await api.rejectGeneratedQuestion(id, "admin", reason);
      alert("Question rejected");
      router.push("/generated-questions");
    } catch (err) {
      console.error("Failed to reject:", err);
      alert("Failed to reject question");
    }
  };

  const handleSaveExplanations = async (data: any) => {
    setSaving(true);
    try {
      await api.editGeneratedQuestion(id, data);
      await loadQuestion();
      setShowEditModal(false);
      alert("✅ Explanations updated");
    } catch (err) {
      console.error("Failed to save:", err);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading question...</p>
        </div>
      </div>
    );
  }

  if (error || !questionCard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Question not found"}</p>
          <Link
            href="/generated-questions"
            className="text-blue-600 hover:underline"
          >
            ← Back to questions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/generated-questions"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Generated Questions
              </Link>

              {questionCard.sourceType === "EXAM_REPLICA" && (
                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-semibold rounded">
                  🟡 Exam Replica
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-sm font-semibold rounded ${
                  questionCard.approvalStatus === "APPROVED"
                    ? "bg-green-100 text-green-800"
                    : questionCard.approvalStatus === "REJECTED"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {questionCard.approvalStatus}
              </span>
            </div>
          </div>

          {questionCard.sourceExamQuestionId && (
            <div className="mt-2 text-sm text-gray-600">
              Source: ExamQuestion #
              {questionCard.sourceExamQuestionId.slice(0, 8)}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Question Solve View */}
          <div className="lg:col-span-2">
            <QuestionSolveView
              questionCard={questionCard}
              solveState={solveState}
              selectedOption={selectedOption}
              isCorrect={isCorrect}
              onOptionSelect={handleOptionSelect}
              onSubmit={handleSubmitAnswer}
            />
          </div>

          {/* Right: Admin Metadata Panel */}
          <div className="lg:col-span-1">
            <AdminMetadataPanel
              questionCard={questionCard}
              hasBeenSolved={hasBeenSolved}
              isCorrect={isCorrect}
              onApprove={handleApprove}
              onReject={handleReject}
              onEdit={() => setShowEditModal(true)}
            />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditExplanationsModal
          questionCard={questionCard}
          onSave={handleSaveExplanations}
          onClose={() => setShowEditModal(false)}
          saving={saving}
        />
      )}
    </div>
  );
}
