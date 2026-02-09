/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  FileQuestion,
  CreditCard,
  HelpCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  Network,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubtopicDetailsViewProps {
  subtopicId: string;
  data: {
    subtopic: any;
    topic: any;
    lesson: any;
    knowledgePoints: any[];
    examQuestions: any[];
    flashcards: {
      approved: any[];
      pending: any[];
    };
    generatedQuestions: {
      approved: any[];
      pending: any[];
    };
    prerequisites: any[];
    stats: {
      totalKnowledgePoints: number;
      totalExamQuestions: number;
      totalFlashcards: number;
      totalGeneratedQuestions: number;
      approvedFlashcards: number;
      approvedGeneratedQuestions: number;
    };
  };
}

export default function SubtopicDetailsView({
  subtopicId,
  data,
}: SubtopicDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "knowledge"
    | "exams"
    | "flashcards"
    | "questions"
    | "prerequisites"
  >("overview");

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: BarChart3 },
    {
      id: "knowledge" as const,
      label: `Knowledge Points (${data.stats.totalKnowledgePoints})`,
      icon: BookOpen,
    },
    {
      id: "exams" as const,
      label: `Exam Questions (${data.stats.totalExamQuestions})`,
      icon: FileQuestion,
    },
    {
      id: "flashcards" as const,
      label: `Flashcards (${data.stats.totalFlashcards})`,
      icon: CreditCard,
    },
    {
      id: "questions" as const,
      label: `Generated Questions (${data.stats.totalGeneratedQuestions})`,
      icon: HelpCircle,
    },
    {
      id: "prerequisites" as const,
      label: `Prerequisites (${data.prerequisites.length})`,
      icon: Network,
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/topics"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Topics
        </Link>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">
                {data.lesson} › {data.topic}
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                {data.subtopic.displayName || subtopicId}
              </h1>
              {data.subtopic.description && (
                <p className="mt-2 text-gray-600">
                  {data.subtopic.description}
                </p>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
            <StatCard
              label="Knowledge Points"
              value={data.stats.totalKnowledgePoints}
              icon={BookOpen}
              color="blue"
            />
            <StatCard
              label="Exam Questions"
              value={data.stats.totalExamQuestions}
              icon={FileQuestion}
              color="purple"
            />
            <StatCard
              label="Flashcards"
              value={data.stats.totalFlashcards}
              icon={CreditCard}
              color="green"
              subtitle={`${data.stats.approvedFlashcards} approved`}
            />
            <StatCard
              label="Generated Q's"
              value={data.stats.totalGeneratedQuestions}
              icon={HelpCircle}
              color="orange"
              subtitle={`${data.stats.approvedGeneratedQuestions} approved`}
            />
            <StatCard
              label="Prerequisites"
              value={data.prerequisites.length}
              icon={Network}
              color="indigo"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "overview" && <OverviewTab data={data} />}
          {activeTab === "knowledge" && (
            <KnowledgePointsTab knowledgePoints={data.knowledgePoints} />
          )}
          {activeTab === "exams" && (
            <ExamQuestionsTab examQuestions={data.examQuestions} />
          )}
          {activeTab === "flashcards" && (
            <FlashcardsTab flashcards={data.flashcards} />
          )}
          {activeTab === "questions" && (
            <GeneratedQuestionsTab questions={data.generatedQuestions} />
          )}
          {activeTab === "prerequisites" && (
            <PrerequisitesTab prerequisites={data.prerequisites} />
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
  subtitle?: string;
}) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
    indigo: "bg-indigo-100 text-indigo-600",
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div
        className={`w-10 h-10 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center mb-2`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function OverviewTab({ data }: { data: SubtopicDetailsViewProps["data"] }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-900 mb-1">
              Content Status
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {data.stats.totalKnowledgePoints} KPs
            </div>
            <div className="text-sm text-blue-600 mt-1">
              Knowledge points extracted
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm font-medium text-green-900 mb-1">
              Study Materials
            </div>
            <div className="text-2xl font-bold text-green-700">
              {data.stats.approvedFlashcards +
                data.stats.approvedGeneratedQuestions}
            </div>
            <div className="text-sm text-green-600 mt-1">
              Approved flashcards & questions
            </div>
          </div>
        </div>
      </div>

      {data.examQuestions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Exam History
          </h3>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm font-medium text-purple-900 mb-2">
              Exam Question Distribution
            </div>
            <div className="space-y-2">
              {(() => {
                const yearCounts = data.examQuestions.reduce(
                  (acc, q) => {
                    acc[q.year] = (acc[q.year] || 0) + 1;
                    return acc;
                  },
                  {} as Record<number, number>,
                );

                return Object.entries(yearCounts)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .slice(0, 5)
                  .map(([year, count]) => (
                    <div key={year} className="flex justify-between text-sm">
                      <span className="text-purple-700">Year {year}</span>
                      <span className="font-semibold text-purple-900">
                        {count as number} question
                        {(count as number) > 1 ? "s" : ""}
                      </span>
                    </div>
                  ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KnowledgePointsTab({ knowledgePoints }: { knowledgePoints: any[] }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateFlashcards = async () => {
    if (knowledgePoints.length === 0) {
      alert("No knowledge points available to generate flashcards from");
      return;
    }

    if (
      !confirm(
        `Generate flashcards from ${knowledgePoints.length} knowledge points?\n\nThis will create 10 different card types (CORE, INTERMEDIATE, ADVANCED) for each knowledge point.`,
      )
    ) {
      return;
    }

    setIsGenerating(true);
    try {
      const knowledgePointIds = knowledgePoints.map((kp) => kp.id);
      const response = await fetch(
        "/api/proxy/flashcards/admin/generate/knowledge-points",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ knowledgePointIds }),
        },
      );

      if (!response.ok) {
        throw new Error("Flashcard generation failed");
      }

      const result = await response.json();
      alert(
        `Flashcard generation complete!\n✅ Successful: ${result.successful}\n❌ Failed: ${result.failed}\n\nView pending flashcards in the Flashcards tab.`,
      );

      // Reload page to show new flashcards
      window.location.reload();
    } catch (error) {
      console.error("Flashcard generation failed:", error);
      alert("Failed to generate flashcards. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (knowledgePoints.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>No knowledge points found for this subtopic.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          {knowledgePoints.length} knowledge point
          {knowledgePoints.length !== 1 ? "s" : ""}
        </div>
        <Button
          onClick={handleGenerateFlashcards}
          disabled={isGenerating}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {isGenerating ? "Generating..." : "Generate Flashcards"}
        </Button>
      </div>
      {knowledgePoints.map((kp, index) => (
        <div
          key={kp.id}
          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
        >
          <div className="flex items-start gap-3">
            <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
              {index + 1}
            </div>
            <div className="flex-1">
              <p className="text-gray-900">{kp.fact}</p>
              <div className="flex items-center gap-3 mt-2 text-sm">
                {kp.priority > 0 && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                    Priority: {kp.priority}
                  </span>
                )}
                {kp.examRelevance && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                    Exam Relevance: {(kp.examRelevance * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExamQuestionsTab({ examQuestions }: { examQuestions: any[] }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingKnowledgePoints, setIsGeneratingKnowledgePoints] =
    useState(false);

  const processAllQuestions = async () => {
    if (examQuestions.length === 0) {
      alert("Please select at least one question to process");
      return;
    }

    const questionIds = examQuestions.map((q) => q.id);

    if (
      !confirm(
        `Are you sure you want to process ${questionIds.length} questions? Only ANALYZED questions will be processed.`,
      )
    ) {
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch(
        "/api/proxy/admin/exam-questions/bulk/process",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionIds }),
        },
      );

      if (!response.ok) {
        throw new Error("Bulk processing failed");
      }

      const result = await response.json();

      alert(
        `Bulk processing started!\nProcessed: ${result.processed}\nSkipped: ${result.skipped}\nErrors: ${result.errors}`,
      );
    } catch (error) {
      console.error("Bulk processing failed:", error);
      alert("Bulk processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateKnowledgePoints = async () => {
    if (examQuestions.length === 0) {
      alert("No exam questions available to generate knowledge points from");
      return;
    }

    if (
      !confirm(
        `Generate knowledge points from ${examQuestions.length} exam questions?\n\nThis will extract spotRule, clinicalCorrelation, and examTrap from ANALYZED Anatomy questions.`,
      )
    ) {
      return;
    }

    setIsGeneratingKnowledgePoints(true);
    try {
      const examQuestionIds = examQuestions.map((q) => q.id);
      const response = await fetch(
        "/api/proxy/knowledge-extraction/admin/generate/exam-questions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examQuestionIds }),
        },
      );

      if (!response.ok) {
        throw new Error("Knowledge point generation failed");
      }

      const result = await response.json();

      // Calculate total KPs created
      const totalKps = result.results
        .filter((r: any) => r.success)
        .reduce((sum: number, r: any) => sum + (r.kpCount || 0), 0);

      // Calculate breakdown
      const spotRuleTotal = result.results
        .filter((r: any) => r.success)
        .reduce((sum: number, r: any) => sum + (r.spotRuleCount || 0), 0);
      const clinicalTotal = result.results
        .filter((r: any) => r.success)
        .reduce(
          (sum: number, r: any) => sum + (r.clinicalCorrelationCount || 0),
          0,
        );
      const trapTotal = result.results
        .filter((r: any) => r.success)
        .reduce((sum: number, r: any) => sum + (r.examTrapCount || 0), 0);

      alert(
        `Knowledge point generation complete!\n\n` +
          `✅ Successful: ${result.successful} questions\n` +
          `❌ Failed: ${result.failed} questions\n\n` +
          `📚 Total KPs Created: ${totalKps}\n` +
          `   - SpotRule: ${spotRuleTotal}\n` +
          `   - Clinical Correlation: ${clinicalTotal}\n` +
          `   - Exam Trap: ${trapTotal}\n\n` +
          `View knowledge points in the Knowledge Points tab.`,
      );

      // Reload page to show new knowledge points
      window.location.reload();
    } catch (error) {
      console.error("Knowledge point generation failed:", error);
      alert("Failed to generate knowledge points. Please try again.");
    } finally {
      setIsGeneratingKnowledgePoints(false);
    }
  };

  if (examQuestions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileQuestion className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>No exam questions found for this subtopic.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <Button onClick={processAllQuestions} disabled={isProcessing}>
          {isProcessing ? "Processing..." : "Process All Questions"}
        </Button>
        <Button
          onClick={handleGenerateKnowledgePoints}
          disabled={isGeneratingKnowledgePoints}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {isGeneratingKnowledgePoints
            ? "Generating..."
            : "Generate Knowledge Points"}
        </Button>
      </div>
      {examQuestions.map((question) => (
        <div
          key={question.id}
          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-sm font-semibold text-purple-600">
                {question.year} {question.examType || "TUS"}
              </span>
              {question.questionNumber && (
                <span className="text-sm text-gray-500 ml-2">
                  Q{question.questionNumber}
                </span>
              )}
            </div>
            <Link
              href={`/exam-questions/${question.id}`}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View Details →
            </Link>
          </div>
          <p className="text-gray-900 mb-3">{question.question}</p>
          <div className="text-xs text-gray-600">
            {question.knowledgePoints.length} knowledge point
            {question.knowledgePoints.length !== 1 ? "s" : ""} linked
          </div>
        </div>
      ))}
    </div>
  );
}

function FlashcardsTab({
  flashcards,
}: {
  flashcards: { approved: any[]; pending: any[] };
}) {
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");

  const displayCards =
    filter === "all"
      ? [...flashcards.approved, ...flashcards.pending]
      : filter === "approved"
        ? flashcards.approved
        : flashcards.pending;

  if (displayCards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>No flashcards found.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All ({flashcards.approved.length + flashcards.pending.length})
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === "approved"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Approved ({flashcards.approved.length})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === "pending"
              ? "bg-yellow-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Pending ({flashcards.pending.length})
        </button>
      </div>

      <div className="space-y-4">
        {displayCards.map((card) => (
          <div
            key={card.id}
            className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`px-2 py-1 text-xs rounded ${
                  card.cardType === "SPOT"
                    ? "bg-blue-100 text-blue-800"
                    : card.cardType === "TRAP"
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                }`}
              >
                {card.cardType}
              </span>
              {card.approvalStatus === "APPROVED" ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Clock className="w-4 h-4 text-yellow-600" />
              )}
            </div>
            <div className="mb-2">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Front:
              </div>
              <p className="text-gray-900">{card.front}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">
                Back:
              </div>
              <p className="text-gray-700">{card.back}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeneratedQuestionsTab({
  questions,
}: {
  questions: { approved: any[]; pending: any[] };
}) {
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");

  const displayQuestions =
    filter === "all"
      ? [...questions.approved, ...questions.pending]
      : filter === "approved"
        ? questions.approved
        : questions.pending;

  if (displayQuestions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>No generated questions found.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All ({questions.approved.length + questions.pending.length})
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === "approved"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Approved ({questions.approved.length})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === "pending"
              ? "bg-yellow-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Pending ({questions.pending.length})
        </button>
      </div>

      <div className="space-y-4">
        {displayQuestions.map((question) => {
          const options =
            typeof question.options === "string"
              ? JSON.parse(question.options)
              : question.options;

          return (
            <div
              key={question.id}
              className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                {question.approvalStatus === "APPROVED" ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Clock className="w-4 h-4 text-yellow-600" />
                )}
                {question.scenarioType && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {question.scenarioType}
                  </span>
                )}
              </div>

              <p className="text-gray-900 font-medium mb-3">
                {question.question}
              </p>

              <div className="space-y-1 mb-3">
                {["A", "B", "C", "D", "E"].map((option) => {
                  const optionText = options[option];
                  if (!optionText) return null;
                  const isCorrect = question.correctAnswer === option;
                  return (
                    <div
                      key={option}
                      className={`text-sm p-2 rounded ${
                        isCorrect ? "bg-green-50 text-green-900" : "bg-gray-50"
                      }`}
                    >
                      <span className="font-semibold">{option}.</span>{" "}
                      {optionText}
                      {isCorrect && <span className="ml-2">✓</span>}
                    </div>
                  );
                })}
              </div>

              {question.explanation && (
                <div className="text-sm text-gray-600 italic border-t pt-2">
                  {question.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PrerequisitesTab({ prerequisites }: { prerequisites: any[] }) {
  if (prerequisites.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Network className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>No prerequisites found for this topic.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prerequisites.map((prereq, index) => (
        <div
          key={index}
          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Network className="w-5 h-5 text-indigo-600" />
              <div>
                <div className="font-medium text-gray-900">{prereq.name}</div>
                <div className="text-sm text-gray-600">
                  Frequency: {prereq.frequency} • Source: {prereq.source}
                </div>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                prereq.strength === "STRONG"
                  ? "bg-red-100 text-red-800"
                  : prereq.strength === "MEDIUM"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
              }`}
            >
              {prereq.strength}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
