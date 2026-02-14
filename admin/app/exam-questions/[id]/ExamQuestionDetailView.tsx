/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import {
  ArrowLeft,
  RefreshCw,
  Save,
  Link as LinkIcon,
  X,
  Trash2,
  FileQuestion,
} from "lucide-react";
import Link from "next/link";

interface ExamQuestion {
  id: string;
  year: number;
  examType: string | null;
  questionNumber: number | null;
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string | null;
  lesson: { id: string; displayName: string } | null;
  topic: { id: string; displayName: string } | null;
  subtopic: { id: string; displayName: string } | null;
  patternType: string | null;
  patternConfidence: number | null;
  traps:
    | Array<{ option: string; reason: string; confusion: string }>
    | string[];
  analysisStatus:
    | "RAW"
    | "PENDING"
    | "PROCESSING"
    | "ANALYZED"
    | "KNOWLEDGE_READY"
    | "CONTENT_READY"
    | "FAILED"
    | "REVIEWED"
    | "REVIEWED";
  analysisPayload?: any;
  analyzedAt: string | null;
  createdAt: string;
  knowledgePoints: Array<{
    id: string;
    relationshipType: "MEASURED" | "TRAP" | "CONTEXT";
    knowledgePoint: {
      id: string;
      fact: string;
      category: string | null;
      subcategory: string | null;
    };
  }>;
  concepts?: Array<{
    id: string;
    concept: {
      id: string;
      preferredLabel: string;
      normalizedLabel: string;
      conceptType: string;
      status: string;
    };
  }>;
}

type Tab = "question" | "analysis" | "concepts" | "knowledge";

export default function ExamQuestionDetailView({
  initialExamQuestion,
  initialKnowledgePoints,
}: {
  initialExamQuestion: ExamQuestion;
  initialKnowledgePoints: any[];
}) {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Create fallback analysisPayload from existing data if missing
  const createFallbackPayload = (question: ExamQuestion) => {
    if (question.analysisPayload) {
      return question.analysisPayload;
    }

    // If analysis is completed but payload is missing, create from existing fields
    if (
      question.analysisStatus === "ANALYZED" ||
      question.analysisStatus === "KNOWLEDGE_READY" ||
      question.analysisStatus === "CONTENT_READY"
    ) {
      return {
        lesson: question.lesson,
        topic: question.topic,
        subtopic: question.subtopic,
        traps: Array.isArray(question.traps) ? question.traps : [],
      };
    }

    return null;
  };

  const [examQuestion, setExamQuestion] = useState<ExamQuestion>({
    ...initialExamQuestion,
    knowledgePoints: initialKnowledgePoints,
    analysisPayload: createFallbackPayload(initialExamQuestion),
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("question");
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    lesson: examQuestion.lesson ? examQuestion.lesson.displayName : "",
    topic: examQuestion.topic ? examQuestion.topic.displayName : "",
    subtopic: examQuestion.subtopic ? examQuestion.subtopic.displayName : "",
    traps: Array.isArray(examQuestion.traps) ? examQuestion.traps : [],
    explanation: examQuestion.explanation || "",
  });
  const [newTrap, setNewTrap] = useState("");
  const [linkKnowledgePointId, setLinkKnowledgePointId] = useState("");
  const [linkRelationshipType, setLinkRelationshipType] = useState<
    "MEASURED" | "TRAP" | "CONTEXT"
  >("MEASURED");
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showLinkConceptDialog, setShowLinkConceptDialog] = useState(false);
  const [conceptSearchQuery, setConceptSearchQuery] = useState("");
  const [conceptSearchResults, setConceptSearchResults] = useState<any[]>([]);
  const [searchingConcepts, setSearchingConcepts] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [showReplicaWarning, setShowReplicaWarning] = useState(false);
  const [generatingKPs, setGeneratingKPs] = useState(false);

  const loadExamQuestion = async () => {
    setLoading(true);
    try {
      const response = await api.getExamQuestionById(id);
      const kpResponse = await api.getKnowledgePointsForExamQuestion(id);
      const questionData = {
        ...response.examQuestion,
        knowledgePoints: kpResponse.knowledgePoints,
      };
      setExamQuestion({
        ...questionData,
        analysisPayload: createFallbackPayload(questionData),
      });
      setEditData({
        lesson: response.examQuestion.lesson
          ? response.examQuestion.lesson.displayName
          : "",
        topic: response.examQuestion.topic
          ? response.examQuestion.topic.displayName
          : "",
        subtopic: response.examQuestion.subtopic
          ? response.examQuestion.subtopic.displayName
          : "",
        traps: Array.isArray(response.examQuestion.traps)
          ? response.examQuestion.traps.every((t: any) => typeof t === "string")
            ? (response.examQuestion.traps as string[])
            : []
          : [],
        explanation: response.examQuestion.explanation || "",
      });
    } catch (error) {
      console.error("Failed to load exam question:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAnalysis = async (lesson?: string) => {
    try {
      await api.triggerAnalysis(id, lesson);
      await loadExamQuestion();
      setShowLessonModal(false);
      setSelectedLesson("");
    } catch (error) {
      console.error("Failed to trigger analysis:", error);
      alert("Failed to trigger analysis");
    }
  };

  const handleOpenAnalysisModal = () => {
    // If lesson is already set, use it as default
    if (examQuestion.lesson) {
      setSelectedLesson(examQuestion.lesson.displayName);
    }
    setShowLessonModal(true);
  };

  const handleConfirmAnalysis = () => {
    if (!selectedLesson) {
      alert("Lütfen bir ders seçin");
      return;
    }
    handleTriggerAnalysis(selectedLesson);
  };

  const handleGenerateKnowledge = async () => {
    try {
      setLoading(true);
      await api.generateKnowledge(id);
      await loadExamQuestion();
      alert("Knowledge point generated successfully");
    } catch (error) {
      console.error("Failed to generate knowledge:", error);
      alert("Failed to generate knowledge");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKnowledgePoints = async () => {
    if (
      !confirm(
        `Generate knowledge points from this question?\n\nThis will extract spotRule, clinicalCorrelation, and examTrap from ANALYZED Anatomy questions.`,
      )
    ) {
      return;
    }

    setGeneratingKPs(true);

    try {
      const response = await fetch(
        "/api/proxy/knowledge-extraction/admin/generate/exam-questions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examQuestionIds: [id] }),
        },
      );

      if (!response.ok) {
        throw new Error("Knowledge point generation failed");
      }

      const result = await response.json();

      if (result.successful > 0) {
        const details = result.results[0];
        alert(
          `Knowledge point generation complete!\n\n` +
            `📚 Total KPs Created: ${details.kpCount || 0}\n` +
            `   - SpotRule: ${details.spotRuleCount || 0}\n` +
            `   - Clinical Correlation: ${details.clinicalCorrelationCount || 0}\n` +
            `   - Exam Trap: ${details.examTrapCount || 0}`,
        );
        await loadExamQuestion();
      } else {
        const errorMsg = result.results[0]?.error || "Unknown error";
        alert(`Failed to generate knowledge points:\n${errorMsg}`);
      }
    } catch (error) {
      console.error("Knowledge point generation failed:", error);
      alert("Knowledge point generation failed. Please try again.");
    } finally {
      setGeneratingKPs(false);
    }
  };

  const handleProcessAnalyzedQuestion = async () => {
    try {
      setLoading(true);
      await api.processAnalyzedQuestion(id);
      await loadExamQuestion();
      alert("Prerequisite processing completed");
    } catch (error) {
      console.error("Failed to process analyzed question:", error);
      alert("Failed to process analyzed question");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuestion = async (provider?: "OPENAI" | "GEMINI") => {
    try {
      setLoading(true);
      await api.generateQuestion(id, provider);
      await loadExamQuestion();
      alert("Question generated successfully");
    } catch (error) {
      console.error("Failed to generate question:", error);
      alert("Failed to generate question");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExamReplica = async () => {
    try {
      setLoading(true);
      await api.createExamReplica(id);
      await loadExamQuestion();
      alert("Exam replica created successfully");
      setShowReplicaWarning(false);
    } catch (error) {
      console.error("Failed to create exam replica:", error);
      alert("Failed to create exam replica");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchConcepts = async (query: string) => {
    if (!query.trim()) {
      setConceptSearchResults([]);
      return;
    }

    try {
      setSearchingConcepts(true);
      const response = await api.searchConcepts(query);
      setConceptSearchResults(response.concepts || []);
    } catch (error) {
      console.error("Failed to search concepts:", error);
    } finally {
      setSearchingConcepts(false);
    }
  };

  const handleLinkConcept = async (conceptId: string) => {
    try {
      setLoading(true);
      await api.linkConcept(id, { conceptId });
      await loadExamQuestion();
      setShowLinkConceptDialog(false);
      setConceptSearchQuery("");
      setConceptSearchResults([]);
    } catch (error) {
      console.error("Failed to link concept:", error);
      alert("Failed to link concept");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkConcept = async (conceptId: string) => {
    if (!confirm("Are you sure you want to unlink this concept?")) {
      return;
    }

    try {
      setLoading(true);
      await api.unlinkConcept(id, conceptId);
      await loadExamQuestion();
    } catch (error) {
      console.error("Failed to unlink concept:", error);
      alert("Failed to unlink concept");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.updateExamQuestion(id, {
        lesson: editData.lesson || undefined,
        topic: editData.topic || undefined,
        subtopic: editData.subtopic || undefined,
        traps: editData.traps as any, // API accepts string[] or object[]
        explanation: editData.explanation || undefined,
      });
      await loadExamQuestion();
      setEditing(false);
    } catch (error) {
      console.error("Failed to update exam question:", error);
      alert("Failed to update exam question");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrap = () => {
    if (newTrap.trim()) {
      setEditData({
        ...editData,
        traps: [...editData.traps, newTrap.trim()] as string[],
      });
      setNewTrap("");
    }
  };

  const handleRemoveTrap = (index: number) => {
    setEditData({
      ...editData,
      traps: editData.traps.filter((_, i) => i !== index) as string[],
    });
  };

  const handleLinkKnowledgePoint = async () => {
    if (!linkKnowledgePointId) {
      alert("Please enter a knowledge point ID");
      return;
    }

    try {
      await api.linkKnowledgePoint(id, {
        knowledgePointId: linkKnowledgePointId,
        relationshipType: linkRelationshipType,
      });
      setLinkKnowledgePointId("");
      await loadExamQuestion();
    } catch (error) {
      console.error("Failed to link knowledge point:", error);
      alert("Failed to link knowledge point");
    }
  };

  const handleUnlinkKnowledgePoint = async (
    knowledgePointId: string,
    relationshipType: "MEASURED" | "TRAP" | "CONTEXT",
  ) => {
    try {
      await api.unlinkKnowledgePoint(id, knowledgePointId, relationshipType);
      await loadExamQuestion();
    } catch (error) {
      console.error("Failed to unlink knowledge point:", error);
      alert("Failed to unlink knowledge point");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Bu soruyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await api.deleteExamQuestion(id);
      router.push("/exam-questions");
    } catch (error) {
      console.error("Failed to delete exam question:", error);
      alert("Soru silinirken bir hata oluştu");
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      PENDING: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
      PROCESSING: { color: "bg-blue-100 text-blue-800", label: "Processing" },
      ANALYZED: { color: "bg-green-100 text-green-800", label: "Analyzed" },
      KNOWLEDGE_READY: {
        color: "bg-purple-100 text-purple-800",
        label: "Knowledge Ready",
      },
      CONTENT_READY: {
        color: "bg-indigo-100 text-indigo-800",
        label: "Content Ready",
      },
      FAILED: { color: "bg-red-100 text-red-800", label: "Failed" },
    };

    const c = config[status] || {
      color: "bg-gray-100 text-gray-800",
      label: status,
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${c.color}`}>
        {c.label}
      </span>
    );
  };

  const getRelationshipBadge = (type: string) => {
    const config: Record<string, { color: string; label: string }> = {
      MEASURED: { color: "bg-green-100 text-green-800", label: "Measured" },
      TRAP: { color: "bg-red-100 text-red-800", label: "Trap" },
      CONTEXT: { color: "bg-blue-100 text-blue-800", label: "Context" },
    };

    const c = config[type] || {
      color: "bg-gray-100 text-gray-800",
      label: type,
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${c.color}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/exam-questions" className="p-2 hover:bg-gray-100 rounded">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              Exam Question {examQuestion.year} -{" "}
              {examQuestion.examType || "N/A"}
              {examQuestion.questionNumber &&
                ` - Q${examQuestion.questionNumber}`}
            </h1>
            {getStatusBadge(examQuestion.analysisStatus)}
          </div>
          <p className="text-gray-600 mt-2">
            Created: {new Date(examQuestion.createdAt).toLocaleDateString()}
            {examQuestion.analyzedAt &&
              ` • Analyzed: ${new Date(examQuestion.analyzedAt).toLocaleDateString()}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("question")}
            className={`px-4 py-2 border-b-2 ${
              activeTab === "question"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Question
          </button>
          <button
            onClick={() => setActiveTab("analysis")}
            className={`px-4 py-2 border-b-2 ${
              activeTab === "analysis"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Analysis
          </button>
          <button
            onClick={() => setActiveTab("concepts")}
            className={`px-4 py-2 border-b-2 ${
              activeTab === "concepts"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Concepts ({examQuestion.concepts?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`px-4 py-2 border-b-2 ${
              activeTab === "knowledge"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Knowledge Links ({examQuestion.knowledgePoints.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "question" && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <p className="text-gray-900 whitespace-pre-wrap">
                {examQuestion.question}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Options
            </label>
            <div className="space-y-2">
              {Object.entries(examQuestion.options).map(([key, value]) => (
                <div
                  key={key}
                  className={`p-3 rounded border ${
                    key === examQuestion.correctAnswer
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-gray-50 border-gray-200 text-gray-400"
                  }`}
                >
                  <span className="font-semibold text-gray-600">{key}:</span>{" "}
                  {value}
                  {key === examQuestion.correctAnswer && (
                    <span className="ml-2 text-green-600 font-semibold">
                      ✓ Correct
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {examQuestion.explanation && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Explanation
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <p className="text-gray-900 whitespace-pre-wrap">
                  {examQuestion.explanation}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "analysis" && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {/* State-based action buttons */}
          {examQuestion.analysisStatus === "RAW" && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
              <p className="text-gray-800 mb-4">
                This question was bulk uploaded and has not been analyzed yet.
              </p>
              <button
                onClick={handleOpenAnalysisModal}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Analyze
              </button>
            </div>
          )}

          {examQuestion.analysisStatus === "PENDING" && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-800 mb-4">
                This question has not been analyzed yet.
              </p>
              <button
                onClick={handleOpenAnalysisModal}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Analyze
              </button>
            </div>
          )}

          {examQuestion.analysisStatus === "PROCESSING" && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-800">Analysis in progress...</p>
            </div>
          )}

          {examQuestion.analysisStatus === "FAILED" && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 mb-4">
                Analysis failed. Please try again.
              </p>
              <button
                onClick={() => handleTriggerAnalysis()}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Analysis
              </button>
            </div>
          )}

          {examQuestion.analysisStatus === "ANALYZED" && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800 mb-4">
                Analysis completed. Ready to generate knowledge.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleProcessAnalyzedQuestion}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 flex items-center gap-2 disabled:opacity-50"
                >
                  Process
                </button>
                <button
                  onClick={handleGenerateKnowledge}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                >
                  Generate Knowledge
                </button>
                <button
                  onClick={handleGenerateKnowledgePoints}
                  disabled={generatingKPs || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <FileQuestion className="w-4 h-4" />
                  {generatingKPs
                    ? "Generating..."
                    : "Generate Knowledge Points"}
                </button>
                <button
                  onClick={() => setShowReplicaWarning(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center gap-2 disabled:opacity-50"
                >
                  Create Exam Replica
                </button>
              </div>
            </div>
          )}

          {examQuestion.analysisStatus === "KNOWLEDGE_READY" && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded">
              <p className="text-purple-800 mb-4">
                Knowledge point generated. Ready to generate content.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerateQuestion("OPENAI")}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
                >
                  Generate Question (OpenAI)
                </button>
                <button
                  onClick={() => handleGenerateQuestion("GEMINI")}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
                >
                  Generate Question (Gemini)
                </button>
              </div>
            </div>
          )}

          {examQuestion.analysisStatus === "CONTENT_READY" && (
            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded">
              <p className="text-indigo-800">
                Content generation completed. Question and flashcards are ready.
              </p>
            </div>
          )}

          {/* Analysis Display */}
          {(examQuestion.analysisStatus === "ANALYZED" ||
            examQuestion.analysisStatus === "KNOWLEDGE_READY" ||
            examQuestion.analysisStatus === "CONTENT_READY") && (
            <>
              {!examQuestion.analysisPayload ? (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-yellow-800 mb-4">
                    Analysis data is incomplete. Please re-analyze the question
                    to get full analysis details.
                  </p>
                  <button
                    onClick={() => handleTriggerAnalysis()}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Re-analyze Question
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Topic / Subtopic */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-400">
                      Classification
                    </h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Lesson
                        </label>
                        <p className="text-gray-900">
                          {examQuestion.analysisPayload.lesson || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Topic
                        </label>
                        <p className="text-gray-900">
                          {examQuestion.topic?.displayName || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subtopic
                        </label>
                        <p className="text-gray-900">
                          {examQuestion.subtopic?.displayName || "N/A"}
                        </p>
                      </div>
                    </div>
                    {/* Exam Pattern */}
                    {(examQuestion.patternType ||
                      examQuestion.analysisPayload?.patternType) && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-indigo-700 mb-1">
                              Exam Pattern
                            </label>
                            <p className="text-indigo-900 font-semibold">
                              {examQuestion.patternType ||
                                examQuestion.analysisPayload?.patternType}
                            </p>
                          </div>
                          {examQuestion.patternConfidence !== null && (
                            <div>
                              <label className="block text-sm font-medium text-indigo-700 mb-1 text-right">
                                Confidence
                              </label>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-indigo-600 h-2 rounded-full"
                                    style={{
                                      width: `${(examQuestion.patternConfidence || examQuestion.analysisPayload?.patternConfidence) * 100}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-indigo-900 font-semibold text-sm">
                                  {(
                                    (examQuestion.patternConfidence ||
                                      examQuestion.analysisPayload
                                        ?.patternConfidence) * 100
                                  ).toFixed(0)}
                                  %
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {examQuestion.analysisPayload && (
                    <>
                      {/* Spot Rule */}
                      {examQuestion.analysisPayload.spotRule && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">
                            Spot Rule
                          </h3>
                          <div className="bg-blue-50 border border-blue-200 rounded p-4">
                            <p className="text-gray-900 font-medium">
                              {examQuestion.analysisPayload.spotRule}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Option Analysis */}
                      {examQuestion.analysisPayload.optionAnalysis &&
                        examQuestion.analysisPayload.optionAnalysis.length >
                          0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-2">
                              Option Analysis (Next Question Method)
                            </h3>
                            <div className="space-y-4">
                              {examQuestion.analysisPayload.optionAnalysis.map(
                                (item: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className={`border rounded p-4 ${
                                      item.importance === "HIGH"
                                        ? "bg-yellow-50 border-yellow-300"
                                        : "bg-gray-50 border-gray-200"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                                        Option {item.option || item.optionLabel}
                                      </span>
                                      {item.importance === "HIGH" && (
                                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                                          HIGH IMPORTANCE
                                        </span>
                                      )}
                                      {item.examFrequency && (
                                        <span
                                          className={`px-2 py-1 text-xs font-semibold rounded ${
                                            item.examFrequency === "HIGH"
                                              ? "bg-green-100 text-green-800"
                                              : item.examFrequency === "MEDIUM"
                                                ? "bg-yellow-100 text-yellow-800"
                                                : "bg-gray-100 text-gray-800"
                                          }`}
                                        >
                                          Frequency: {item.examFrequency}
                                        </span>
                                      )}
                                      {item.confusionRisk && (
                                        <span
                                          className={`px-2 py-1 text-xs font-semibold rounded ${
                                            item.confusionRisk === "HIGH"
                                              ? "bg-orange-100 text-orange-800"
                                              : "bg-gray-100 text-gray-800"
                                          }`}
                                        >
                                          Confusion Risk: {item.confusionRisk}
                                        </span>
                                      )}
                                    </div>
                                    {item.structure && (
                                      <div className="mb-2">
                                        <p className="text-sm font-medium text-gray-700">
                                          Structure:
                                        </p>
                                        <p className="text-gray-900">
                                          {item.structure}
                                        </p>
                                      </div>
                                    )}
                                    <div className="mb-2">
                                      <p className="text-sm font-medium text-gray-700">
                                        Would be correct if:
                                      </p>
                                      <p className="text-gray-900">
                                        {item.wouldBeCorrectIf}
                                      </p>
                                    </div>
                                    {item.clinicalOutcome && (
                                      <div className="mb-2">
                                        <p className="text-sm font-medium text-gray-700">
                                          Clinical Outcome:
                                        </p>
                                        <p className="text-gray-900">
                                          {item.clinicalOutcome}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ),
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              <strong>Note:</strong> This analysis shows what
                              question each wrong option would be correct for.
                              Options marked as HIGH IMPORTANCE are
                              exam-critical and commonly confused.
                            </p>
                          </div>
                        )}

                      {/* Spatial Context */}
                      {examQuestion.analysisPayload.spatialContext && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">
                            Spatial Context
                          </h3>
                          <ul className="list-disc list-inside space-y-1">
                            {examQuestion.analysisPayload.spatialContext.map(
                              (item: string, idx: number) => (
                                <li key={idx} className="text-gray-900">
                                  {item}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Clinical Correlation */}
                      {examQuestion.analysisPayload.clinicalCorrelation && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">
                            Clinical Correlation
                          </h3>
                          <div className="bg-gray-50 border border-gray-200 rounded p-4">
                            <p className="text-gray-900">
                              {examQuestion.analysisPayload.clinicalCorrelation}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Exam Trap */}
                      {examQuestion.analysisPayload.examTrap && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">
                            Exam Trap
                          </h3>
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                            <p className="text-gray-900">
                              <strong>Confused with:</strong>{" "}
                              {
                                examQuestion.analysisPayload.examTrap
                                  .confusedWith
                              }
                            </p>
                            <p className="text-gray-900 mt-2">
                              <strong>Key difference:</strong>{" "}
                              {
                                examQuestion.analysisPayload.examTrap
                                  .keyDifference
                              }
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Prerequisites */}
                      {examQuestion.analysisPayload.prerequisites &&
                        Array.isArray(
                          examQuestion.analysisPayload.prerequisites,
                        ) &&
                        examQuestion.analysisPayload.prerequisites.length >
                          0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-2">
                              Prerequisites (Önkoşul Bilgiler)
                            </h3>
                            <div className="bg-purple-50 border border-purple-200 rounded p-4">
                              <p className="text-sm text-purple-800 mb-3">
                                Bu soruyu çözebilmek için gerekli temel
                                bilgiler:
                              </p>
                              <ul className="list-disc pl-2 space-y-2">
                                {examQuestion.analysisPayload.prerequisites.map(
                                  (
                                    prereq:
                                      | {
                                          label?: string;
                                          conceptHints?: string[];
                                        }
                                      | string,
                                    idx: number,
                                  ) => {
                                    const label =
                                      typeof prereq === "string"
                                        ? prereq
                                        : prereq.label ||
                                          prereq.conceptHints?.[0] ||
                                          "N/A";
                                    const hints =
                                      typeof prereq === "string"
                                        ? []
                                        : prereq.conceptHints || [];
                                    return (
                                      <li key={idx} className="text-gray-900">
                                        <div className="font-medium">
                                          {label}
                                        </div>
                                        {hints.length > 0 && (
                                          <div className="mt-1 flex flex-wrap gap-2">
                                            {hints.map((hint, hintIdx) => (
                                              <span
                                                key={`${idx}-${hintIdx}`}
                                                className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700"
                                              >
                                                {hint}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </li>
                                    );
                                  },
                                )}
                              </ul>
                            </div>
                          </div>
                        )}
                    </>
                  )}

                  {examQuestion.analysisPayload &&
                    examQuestion.analysisPayload.lesson === "Fizyoloji" && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Mechanizm Chain
                        </h3>
                        <div className="bg-green-50 border border-green-200 rounded p-4">
                          <p className="text-gray-900 whitespace-pre-wrap">
                            {examQuestion.analysisPayload.mechanismChain}
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Traps (for all lessons) */}
                  {examQuestion.analysisPayload?.traps &&
                    Array.isArray(examQuestion.analysisPayload.traps) &&
                    examQuestion.analysisPayload.traps.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Traps</h3>
                        <div className="space-y-3">
                          {examQuestion.analysisPayload.traps.map(
                            (trap: any, idx: number) => (
                              <div
                                key={idx}
                                className="bg-red-50 border border-red-200 rounded p-4"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                                    Option {trap.option}
                                  </span>
                                </div>
                                <div className="mb-2">
                                  <p className="text-sm font-medium text-gray-700">
                                    Reason:
                                  </p>
                                  <p className="text-sm text-gray-900">
                                    {trap.reason}
                                  </p>
                                </div>
                                {trap.confusion && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">
                                      Confusion:
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {trap.confusion}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {/* Explanation Suggestion */}
                  {examQuestion.analysisPayload?.explanationSuggestion && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Explanation Suggestion
                      </h3>
                      <div className="bg-gray-50 border border-gray-200 rounded p-4">
                        <p className="text-gray-900 whitespace-pre-wrap">
                          {examQuestion.analysisPayload.explanationSuggestion}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Legacy COMPLETED status - now handled by ANALYZED */}
          {false && (
            <>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lesson
                    </label>
                    <input
                      type="text"
                      value={editData.lesson}
                      onChange={(e) =>
                        setEditData({ ...editData, lesson: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="Dahiliye, Pediatri..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Topic
                    </label>
                    <input
                      type="text"
                      value={editData.topic}
                      onChange={(e) =>
                        setEditData({ ...editData, topic: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="Diyabet, Epilepsi..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subtopic
                    </label>
                    <input
                      type="text"
                      value={editData.subtopic}
                      onChange={(e) =>
                        setEditData({ ...editData, subtopic: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="Patofizyoloji, Tanı..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Traps
                    </label>
                    <div className="space-y-2 mb-2">
                      {editData.traps.map((trap, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-50 border border-gray-200 rounded p-2">
                            {typeof trap === "string"
                              ? trap
                              : JSON.stringify(trap)}
                          </div>
                          <button
                            onClick={() => handleRemoveTrap(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTrap}
                        onChange={(e) => setNewTrap(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleAddTrap()}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded"
                        placeholder="Add a trap..."
                      />
                      <button
                        onClick={handleAddTrap}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        // setEditData({
                        //   lesson: examQuestion.lesson || "",
                        //   topic: examQuestion.topic || "",
                        //   subtopic: examQuestion.subtopic || "",
                        //   traps: Array.isArray(examQuestion.traps)
                        //     ? examQuestion.traps
                        //     : [],
                        //   explanation: examQuestion.explanation || "",
                        // });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lesson
                    </label>
                    <div className="bg-gray-50 text-gray-900 border border-gray-200 rounded p-3">
                      {examQuestion.lesson?.displayName || (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Topic
                    </label>
                    <div className="bg-gray-50 text-gray-900 border border-gray-200 rounded p-3">
                      {examQuestion.topic?.displayName || (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subtopic
                    </label>
                    <div className="bg-gray-50 text-gray-900 border border-gray-200 rounded p-3">
                      {examQuestion.subtopic?.displayName || (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Traps
                    </label>
                    {Array.isArray(examQuestion.traps) &&
                    examQuestion.traps.length > 0 ? (
                      <div className="space-y-3">
                        {examQuestion.traps.map((trap: any, index: number) => {
                          // Support both old format (string) and new format (object)
                          if (typeof trap === "string") {
                            return (
                              <div
                                key={index}
                                className="bg-gray-50 text-gray-900 border border-gray-200 rounded p-3"
                              >
                                {trap}
                              </div>
                            );
                          }
                          return (
                            <div
                              key={index}
                              className="bg-gray-50 text-gray-900 border border-gray-200 rounded p-4"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                                  Option {trap.option}
                                </span>
                              </div>
                              <div className="mb-2">
                                <p className="text-sm font-medium text-gray-700">
                                  Reason:
                                </p>
                                <p className="text-sm text-gray-900">
                                  {trap.reason}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">
                                  Confusion:
                                </p>
                                <p className="text-sm text-gray-600">
                                  {trap.confusion}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-gray-50 text-gray-900 border border-gray-200 rounded p-3 text-gray-400">
                        No traps identified
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Edit Analysis
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Concepts Tab */}
      {activeTab === "concepts" && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Related Concepts</h2>
            <button
              onClick={() => setShowLinkConceptDialog(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <LinkIcon className="w-4 h-4" />
              Link Concept
            </button>
          </div>
          {!examQuestion.concepts || examQuestion.concepts.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded p-8 text-center">
              <p className="text-gray-500">
                No concepts linked to this question yet.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Concepts are automatically linked during question analysis.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {examQuestion.concepts.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <Link
                    href={`/concepts/${link.concept.id}`}
                    className="flex-1 hover:text-blue-600"
                  >
                    <h3 className="font-medium text-gray-900">
                      {link.concept.preferredLabel}
                    </h3>
                    {link.concept.normalizedLabel !==
                      link.concept.preferredLabel && (
                      <p className="text-sm text-gray-500 mt-1">
                        {link.concept.normalizedLabel}
                      </p>
                    )}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {link.concept.conceptType}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        link.concept.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : link.concept.status === "NEEDS_REVIEW"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {link.concept.status}
                    </span>
                    <button
                      onClick={() => handleUnlinkConcept(link.concept.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Knowledge Tab */}
      {activeTab === "knowledge" && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Link Knowledge Point</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={linkKnowledgePointId}
                onChange={(e) => setLinkKnowledgePointId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
                placeholder="Knowledge Point ID"
              />
              <select
                value={linkRelationshipType}
                onChange={(e) =>
                  setLinkRelationshipType(
                    e.target.value as "MEASURED" | "TRAP" | "CONTEXT",
                  )
                }
                className="px-3 py-2 border border-gray-300 rounded"
              >
                <option value="MEASURED">Measured</option>
                <option value="TRAP">Trap</option>
                <option value="CONTEXT">Context</option>
              </select>
              <button
                onClick={handleLinkKnowledgePoint}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              >
                <LinkIcon className="w-4 h-4" />
                Link
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">
              Linked Knowledge Points
            </h3>
            {examQuestion.knowledgePoints.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded p-4 text-center text-gray-500">
                No knowledge points linked
              </div>
            ) : (
              <div className="space-y-3">
                {examQuestion.knowledgePoints.map((link) => (
                  <div
                    key={`${link.knowledgePoint.id}-${link.relationshipType}`}
                    className="bg-gray-50 border border-gray-200 rounded p-4 flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getRelationshipBadge(link.relationshipType)}
                        <Link
                          href={`/knowledge/${link.knowledgePoint.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {link.knowledgePoint.id.substring(0, 8)}...
                        </Link>
                      </div>
                      <p className="text-sm text-gray-700">
                        {link.knowledgePoint.fact}
                      </p>
                      {link.knowledgePoint.category && (
                        <p className="text-xs text-gray-500 mt-1">
                          {link.knowledgePoint.category}
                          {link.knowledgePoint.subcategory &&
                            ` / ${link.knowledgePoint.subcategory}`}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        handleUnlinkKnowledgePoint(
                          link.knowledgePoint.id,
                          link.relationshipType,
                        )
                      }
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Link Concept Dialog */}
      {showLinkConceptDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Link Concept to Question
              </h2>
              <button
                onClick={() => {
                  setShowLinkConceptDialog(false);
                  setConceptSearchQuery("");
                  setConceptSearchResults([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Concepts
              </label>
              <input
                type="text"
                value={conceptSearchQuery}
                onChange={(e) => {
                  setConceptSearchQuery(e.target.value);
                  handleSearchConcepts(e.target.value);
                }}
                placeholder="Type to search concepts..."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {searchingConcepts && (
              <div className="text-center py-4 text-gray-500">Searching...</div>
            )}

            {conceptSearchResults.length > 0 && (
              <div className="space-y-2">
                {conceptSearchResults.map((concept) => (
                  <button
                    key={concept.id}
                    onClick={() => handleLinkConcept(concept.id)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {concept.preferredLabel}
                        </h3>
                        {concept.normalizedLabel !== concept.preferredLabel && (
                          <p className="text-sm text-gray-500">
                            {concept.normalizedLabel}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {concept.conceptType}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            concept.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {concept.status}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lesson Selection Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Ders Seçimi
              </h2>
              <button
                onClick={() => {
                  setShowLessonModal(false);
                  setSelectedLesson("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Analiz için bir ders seçin. Seçilen derse özel analiz
              yapılacaktır.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ders <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Ders Seçin --</option>
                <option value="Anatomi">Anatomi</option>
                <option value="Farmakoloji">Farmakoloji</option>
                <option value="Dahiliye">Dahiliye</option>
                <option value="Patoloji">Patoloji</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Not: Şu anda sadece yukarıdaki dersler için özel analiz
                desteklenmektedir.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowLessonModal(false);
                  setSelectedLesson("");
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                İptal
              </button>
              <button
                onClick={handleConfirmAnalysis}
                disabled={!selectedLesson || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4" />
                Analiz Başlat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exam Replica Warning Modal */}
      {showReplicaWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-amber-900 flex items-center gap-2">
                ⚠️ Exam Replica Uyarısı
              </h2>
              <button
                onClick={() => setShowReplicaWarning(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded p-4">
                <p className="text-sm text-amber-900 font-medium mb-2">
                  Bu işlem sorunun birebir kopyasını oluşturur.
                </p>
                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                  <li>Öğrenciler bu soruyu ezberleyebilir</li>
                  <li>Ölçme geçerliliği azalır (hatırlama vs öğrenme)</li>
                  <li>
                    Analytics ve prediction modelleri etkilenmez (EXAM_REPLICA
                    filtresi)
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="text-sm text-green-900 font-semibold mb-2">
                  ✅ Meşru Kullanım Alanları:
                </p>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>
                    <strong>1. Çıkmış Sorular Modu:</strong> Öğrenci gerçek
                    sınav sorusunu görmek istiyorsa
                  </li>
                  <li>
                    <strong>2. Baseline Calibration:</strong> Sistem
                    performansını ölçmek için (sınırlı kullanım)
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-sm text-blue-900">
                  <strong>Not:</strong> Bu soru öğrenciye 🟡 &quot;Çıkmış Soru
                  (TUS)&quot; badge&apos;i ile gösterilecek ve adaptive learning
                  feed&apos;ine dahil edilmeyecektir.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowReplicaWarning(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                İptal
              </button>
              <button
                onClick={handleCreateExamReplica}
                disabled={loading}
                className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center gap-2 disabled:opacity-50"
              >
                Onayla ve Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
