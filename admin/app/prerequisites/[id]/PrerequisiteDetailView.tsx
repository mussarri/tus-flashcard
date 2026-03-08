/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  ExternalLink,
  GitMerge,
  Link as LinkIcon,
  Edit,
  History,
  TrendingUp,
  Layers,
  FileQuestion,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { LinkConceptDialog } from "./LinkConceptDialog";
import { CreateConceptDialog } from "./CreateConceptDialog";
import { MergePrerequisiteDialog } from "./MergePrerequisiteDialog";
import { EditPrerequisiteDialog } from "./EditPrerequisiteDialog";

interface PrerequisiteDetailViewProps {
  prerequisite: {
    id: string;
    name: string;
    canonicalKey: string | null;
    createdAt: string;
    updatedAt: string;
    linkedConcepts: Array<{
      conceptId: string;
      preferredLabel: string;
      conceptType: string;
      status: string;
    }>;
    isConceptLess: boolean;
    topicCoverage: Array<{
      topicName: string;
      subtopic: string | null;
      frequency: number;
      strength: string;
    }>;
    totalFrequency: number;
    maxStrength: string;
    examMetrics: {
      examImportance: number;
      totalFrequency: number;
      maxStrength: string;
      rank?: number;
    };
    patternContext: Array<{
      patternType: string;
      count: number;
    }>;
    sourceEvidence?: {
      questions: Array<{
        questionId: string;
        year: number;
        topic: string | null;
        subtopic: string | null;
        patternType: string | null;
      }>;
      total: number;
    };
    questions: Array<any>;
    mergeCandidates: Array<{
      prerequisiteId: string;
      name: string;
      similarityScore: number;
      reasons: string[];
    }>;
  };
  lesson: string;
  error: string | null;
}

export default function PrerequisiteDetailView({
  prerequisite,
  lesson, // eslint-disable-line @typescript-eslint/no-unused-vars
  error, // eslint-disable-line @typescript-eslint/no-unused-vars
}: PrerequisiteDetailViewProps) {
  const router = useRouter();
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"frequency" | "topic">("frequency");
  const [showLinkConceptDialog, setShowLinkConceptDialog] = useState(false);
  const [showCreateConceptDialog, setShowCreateConceptDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [selectedMergeCandidate, setSelectedMergeCandidate] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // TODO: Use lesson and error props for future features

  // Helper functions
  const getStrengthColor = (strength: string) => {
    if (strength === "STRONG") return "bg-purple-600";
    if (strength === "MEDIUM") return "bg-blue-600";
    return "bg-gray-400";
  };

  const getConceptTypeColor = (type: string) => {
    switch (type) {
      case "STRUCTURE":
        return "bg-blue-100 text-blue-800";
      case "FUNCTION":
        return "bg-green-100 text-green-800";
      case "CLINICAL":
        return "bg-red-100 text-red-800";
      case "PATHOLOGY":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get unique years for filtering
  const uniqueYears = prerequisite.sourceEvidence
    ? Array.from(
        new Set(prerequisite.sourceEvidence.questions.map((q) => q.year)),
      ).sort((a, b) => b - a)
    : [];

  // Get unique topics for filtering
  const uniqueTopics = prerequisite.sourceEvidence
    ? Array.from(
        new Set(
          prerequisite.sourceEvidence.questions
            .map((q) => q.topic)
            .filter(Boolean),
        ),
      ).sort()
    : [];

  // Filter evidence questions
  const filteredQuestions =
    prerequisite.sourceEvidence?.questions.filter((q) => {
      const matchesYear =
        yearFilter === "all" || q.year === parseInt(yearFilter);
      const matchesTopic = topicFilter === "all" || q.topic === topicFilter;
      return matchesYear && matchesTopic;
    }) || [];

  // Sort topic coverage
  const sortedTopics = [...prerequisite.topicCoverage].sort((a, b) => {
    if (sortBy === "frequency") {
      return b.frequency - a.frequency;
    }
    return a.topicName.localeCompare(b.topicName);
  });

  // Top topic
  const topTopic = prerequisite.topicCoverage[0];

  return (
    <div className="space-y-6 p-8">
      {/* Back Navigation */}
      <Button
        variant="ghost"
        onClick={() => router.push("/prerequisite-learning")}
        className="mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Prerequisites
      </Button>

      {/* 1️⃣ HEADER - Context & Actions */}
      <div className="border-b pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {prerequisite.name}
            </h1>
            <div className="flex flex-wrap gap-2 ">
              {/* Strength Badge */}
              <Badge
                className={`${getStrengthColor(prerequisite.maxStrength)} text-white`}
              >
                {prerequisite.maxStrength}
              </Badge>

              {/* Exam Importance Badge */}
              <Badge variant="outline" className="border-purple-300">
                <TrendingUp className="h-3 w-3 mr-1" />
                {prerequisite.examMetrics.examImportance.toFixed(1)}% Exam
                Importance
              </Badge>

              {/* Concept Status Badge */}
              {prerequisite.isConceptLess ? (
                <Badge
                  variant="outline"
                  className="border-red-300 text-red-700 bg-red-50"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Concept-less
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-green-300 text-green-700 bg-green-50"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Concept-linked
                </Badge>
              )}

              {/* Rank Badge */}
              {prerequisite.examMetrics.rank && (
                <Badge variant="secondary">
                  Rank #{prerequisite.examMetrics.rank}
                </Badge>
              )}
            </div>
          </div>
          {/* Primary Actions */}
          <div className="flex gap-2 flex-1 ">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMergeDialog(true)}
            >
              <GitMerge className="h-4 w-4 mr-2" />
              Merge
            </Button>
            <Button
              variant="outline"
              className="w-max"
              size="sm"
              onClick={() => setShowLinkConceptDialog(true)}
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Link Concept
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            {/* <Button variant="ghost" size="sm">
              <History className="h-4 w-4 mr-2" />
              Audit Log
            </Button> */}
          </div>
        </div>
      </div>

      {/* 2️⃣ SUMMARY CARDS - At-a-Glance Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-medium">
              Exam Importance
            </CardDescription>
            <CardTitle className="text-3xl">
              {prerequisite.examMetrics.examImportance.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {prerequisite.examMetrics.rank && (
              <p className="text-xs text-gray-500">
                Rank #{prerequisite.examMetrics.rank} among all prerequisites
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-medium">
              Frequency
            </CardDescription>
            <CardTitle className="text-3xl">
              {prerequisite.totalFrequency}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-gray-500">
              Total questions requiring this
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-medium">
              Topic Coverage
            </CardDescription>
            <CardTitle className="text-3xl">
              {prerequisite.topicCoverage.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-gray-500">
              Top: {topTopic?.topicName || "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer hover:shadow-md transition-shadow ${
            prerequisite.isConceptLess ? "border-red-200 bg-red-50" : ""
          }`}
        >
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-medium">
              Concept Coverage
            </CardDescription>
            <CardTitle className="text-3xl">
              {prerequisite.linkedConcepts.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {prerequisite.isConceptLess ? (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                No concepts linked
              </p>
            ) : (
              <p className="text-xs text-gray-500">Concepts linked</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3️⃣ CONCEPT BINDING SECTION */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Concept Binding
              </CardTitle>
              <CardDescription>
                Ontology alignment and semantic grounding
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLinkConceptDialog(true)}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Link Existing Concept
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateConceptDialog(true)}
              >
                Create New Concept
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {prerequisite.isConceptLess ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This prerequisite is not linked to any
                concept. This may indicate ambiguous scope or missing ontology
                coverage.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-3">
                This prerequisite is linked to the following concepts:
              </p>
              <div className="flex flex-wrap gap-2">
                {prerequisite.linkedConcepts.map((concept) => (
                  <div
                    key={concept.conceptId}
                    className="border rounded-lg p-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className={getConceptTypeColor(concept.conceptType)}
                      >
                        {concept.conceptType}
                      </Badge>
                      <Badge
                        variant={
                          concept.status === "ACTIVE" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {concept.status}
                      </Badge>
                    </div>
                    <p className="font-semibold text-sm">
                      {concept.preferredLabel}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View in Concept Explorer
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4️⃣ TOPIC & SUBTOPIC COVERAGE */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Topic & Subtopic Coverage</CardTitle>
              <CardDescription>
                Curriculum footprint across exam topics
              </CardDescription>
            </div>
            <Select
              value={sortBy}
              onValueChange={(value) =>
                setSortBy(value as "frequency" | "topic")
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="frequency">Sort by Frequency</SelectItem>
                <SelectItem value="topic">Sort by Topic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead>Subtopic</TableHead>
                <TableHead className="text-center">Frequency</TableHead>
                <TableHead className="text-center">Strength</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTopics.map((topic, idx) => (
                <TableRow
                  key={idx}
                  className={topic.strength === "STRONG" ? "bg-purple-50" : ""}
                >
                  <TableCell className="font-medium">
                    {topic.topicName}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {topic.subtopic || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{topic.frequency}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={`${getStrengthColor(topic.strength)} text-white`}
                    >
                      {topic.strength}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 5️⃣ PATTERN CONTEXT */}
      <Card>
        <CardHeader>
          <CardTitle>Pattern Context</CardTitle>
          <CardDescription>
            Why this prerequisite is tested in exams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {prerequisite.patternContext.length === 0 ? (
              <p className="text-sm text-gray-500">
                No pattern data available yet.
              </p>
            ) : (
              prerequisite.patternContext.map((pattern, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border-b pb-3 last:border-b-0"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {pattern.patternType}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-base">
                    {pattern.count}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 6️⃣ SOURCE EVIDENCE */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5" />
                Source Evidence
              </CardTitle>
              <CardDescription>
                Example exam questions (
                {prerequisite.sourceEvidence?.total || 0} total)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {uniqueYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={topicFilter} onValueChange={setTopicFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {uniqueTopics.map((topic) => (
                    <SelectItem key={topic} value={topic as string}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredQuestions.length === 0 ? (
            <p className="text-sm text-gray-500">
              No questions found with current filters.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question ID</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Subtopic</TableHead>
                  <TableHead>Pattern Type</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.slice(0, 10).map((question) => (
                  <TableRow key={question.questionId}>
                    <TableCell className="font-mono text-xs">
                      {question.questionId.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{question.year}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {question.topic || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {question.subtopic || "—"}
                    </TableCell>
                    <TableCell>
                      {question.patternType ? (
                        <Badge variant="secondary" className="text-xs">
                          {question.patternType}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filteredQuestions.length > 10 && (
            <p className="text-xs text-gray-500 mt-3">
              Showing 10 of {filteredQuestions.length} questions
            </p>
          )}
        </CardContent>
      </Card>

      {prerequisite.questions.length === 0 ? (
        <p className="text-gray-500">
          Bu prerequisite ile ilişkili soru bulunmuyor.
        </p>
      ) : (
        prerequisite.questions.map((question) => {
          const options = Object.values(question.options) as string[];
          return (
            <div
              key={question.id}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-sm font-semibold text-purple-600">
                    {question.year} {"TUS"}
                  </span>
                  <span className="mx-2 text-gray-400">|</span>
                  <span className="text-sm font-medium text-gray-700">
                    {question.topic?.name}
                  </span>
                  {question.subtopic && (
                    <span className="text-sm text-gray-500">
                      {" "}
                      - {question.subtopic.name}
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
              <p className="text-gray-900 mb-3 text-sm">
                {question.question.split("A)")[0]}
              </p>
              <div className="space-y-2">
                {options.map((option: string, idx: number) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-md border ${
                      question.correctAnswer === String.fromCharCode(65 + idx)
                        ? "bg-green-100 border-green-400"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <span className="font-semibold mr-2">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <span>{option}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* 7️⃣ MERGE CANDIDATES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Merge Candidates
          </CardTitle>
          <CardDescription>
            Similar prerequisites that may need consolidation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {prerequisite.mergeCandidates.length === 0 ? (
            <p className="text-sm text-gray-500">
              No similar prerequisites found. This prerequisite is likely
              unique.
            </p>
          ) : (
            <div className="space-y-3">
              {prerequisite.mergeCandidates.map((candidate) => (
                <div
                  key={candidate.prerequisiteId}
                  className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base">
                        {candidate.name}
                      </h4>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {candidate.reasons.map((reason, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs"
                          >
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Similarity</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {candidate.similarityScore}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedMergeCandidate(candidate.prerequisiteId);
                          setShowMergeDialog(true);
                        }}
                      >
                        <GitMerge className="h-4 w-4 mr-2" />
                        Merge
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 8️⃣ AUDIT & HISTORY */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit & History
          </CardTitle>
          <CardDescription>
            Editorial accountability and change log
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Created</p>
                <p className="text-xs text-gray-500">
                  {new Date(prerequisite.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Last Updated
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(prerequisite.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Canonical Key
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  {prerequisite.canonicalKey || "Not set"}
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" className="mt-4 w-full">
            <History className="h-4 w-4 mr-2" />
            View Full Audit Log
          </Button>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {showLinkConceptDialog && (
        <LinkConceptDialog
          prerequisite={prerequisite}
          onClose={() => setShowLinkConceptDialog(false)}
          onComplete={() => {
            setShowLinkConceptDialog(false);
            router.refresh();
          }}
        />
      )}

      {showCreateConceptDialog && (
        <CreateConceptDialog
          prerequisite={prerequisite}
          onClose={() => setShowCreateConceptDialog(false)}
          onComplete={() => {
            setShowCreateConceptDialog(false);
            router.refresh();
          }}
        />
      )}

      {showMergeDialog && (
        <MergePrerequisiteDialog
          prerequisite={prerequisite}
          initialSelectedId={selectedMergeCandidate}
          onClose={() => {
            setShowMergeDialog(false);
            setSelectedMergeCandidate(null);
          }}
          onComplete={() => {
            setShowMergeDialog(false);
            setSelectedMergeCandidate(null);
            router.refresh();
          }}
        />
      )}

      {showEditDialog && (
        <EditPrerequisiteDialog
          prerequisite={prerequisite}
          onClose={() => setShowEditDialog(false)}
          onComplete={() => {
            setShowEditDialog(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
