/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface TopicObject {
  id: string;
  name: string;
  displayName?: string | null;
  description?: string | null;
  status?: string | null;
  lessonId?: string | null;
  mergedIntoId?: string | null;
  questionCount?: number;
  knowledgePointCount?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

type ConceptRef = string | TopicObject;

interface ConfusionPair {
  concept1: ConceptRef;
  concept2: ConceptRef;
  differentiator?: string | null;
}

interface TrapHotspot {
  topic: TopicObject | string;
  trapType: string | Record<string, any> | null;
  frequency: number;
  confusionPairs: ConfusionPair[];
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
}

interface ContentRecommendation {
  type: "FLASHCARD" | "QUESTION" | "PREREQUISITE";
  priority: "HIGH" | "MEDIUM" | "LOW";
  topic: string; // often an id
  topicName?: string;
  reasoning: string;
  metrics: {
    examFrequency: number;
    currentCoverage: number;
    gap: number;
  };
}

interface PatternFrequencyItem {
  pattern: string;
  count: number;
  percentage: number;
  avgYear: number;
  trend: "increasing" | "decreasing" | "stable";
}

interface TopicPatternRow {
  topic: string;
  patterns: Array<{
    pattern: string;
    frequency: number;
    reliability: number | null;
  }>;
  totalQuestions: number;
}

interface PrerequisiteImpactItem {
  id: string;
  prerequisite: string;
  conceptIds?: string[];
  linkedTopics: string[];
  frequency: number;
  strength: "WEAK" | "MEDIUM" | "STRONG";
  examImportance: number;
}

interface YearlyTrend {
  year: number;
  totalQuestions: number;
  topTopics: Array<{
    topic: string | null;
    count: number;
    percentage: number;
  }>;
  topPatterns: Array<{
    patternType: string;
    count: number;
  }>;
  newTopics: Array<string | null>;
}

interface ExamIntelligenceReport {
  metadata: {
    generatedAt: string;
    totalQuestionsAnalyzed: number;
    yearRange: { min: number; max: number };
    lessons: string[];
  };
  patternFrequency: PatternFrequencyItem[];
  topicPatternMatrix: TopicPatternRow[];
  prerequisiteImpact: PrerequisiteImpactItem[];
  yearlyTrends: YearlyTrend[];
  trapHotspots: TrapHotspot[];
  contentRecommendations: ContentRecommendation[];
}

interface Props {
  initialReport: ExamIntelligenceReport | null;
  error: string | null;
  backendUrl: string;
}

export default function ExamIntelligenceView({
  initialReport,
  error,
  backendUrl,
}: Props) {
  const router = useRouter();
  const [selectedLesson, setSelectedLesson] = useState<string>("all");
  const [startYear, setStartYear] = useState<string>("all");
  const [endYear, setEndYear] = useState<string>("all");
  const [report, setReport] = useState<ExamIntelligenceReport | null>(
    initialReport,
  );
  console.log(report);

  const [isLoading, setIsLoading] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  type TabKey =
    | "executive"
    | "yearly"
    | "matrix"
    | "prereq"
    | "traps"
    | "content";
  const [activeTab, setActiveTab] = useState<TabKey>("executive");
  const [trapLessonFilter, setTrapLessonFilter] = useState<string>("all");
  const filteredTraps = useMemo(() => {
    if (!report?.trapHotspots) return [] as TrapHotspot[];
    if (trapLessonFilter === "all") return report.trapHotspots;
    return report.trapHotspots.filter((t) => {
      const topicName =
        typeof t.topic === "object" && t.topic !== null
          ? t.topic.displayName || t.topic.name || t.topic.id
          : (t.topic as string);
      return topicName === trapLessonFilter;
    });
  }, [report?.trapHotspots, trapLessonFilter]);

  const [trapTopicFilter, setTrapTopicFilter] = useState<string>("all");
  const topicOptions = useMemo(() => {
    const set = new Set<string>();
    report?.topicPatternMatrix?.forEach((r) => {
      if (r.topic) set.add(r.topic);
    });
    report?.trapHotspots?.forEach((t) => {
      const topicName =
        typeof t.topic === "object" && t.topic !== null
          ? t.topic.displayName || t.topic.name || t.topic.id
          : (t.topic as string);
      if (topicName) set.add(topicName);
    });
    return Array.from(set).sort();
  }, [report?.topicPatternMatrix, report?.trapHotspots]);

  // extend filteredTraps to respect trapTopicFilter
  const filteredTrapsWithTopic = useMemo(() => {
    const base = filteredTraps || [];
    if (!base || base.length === 0) return [] as TrapHotspot[];
    if (trapTopicFilter === "all") return base;
    return base.filter((t) => {
      const topicName =
        typeof t.topic === "object" && t.topic !== null
          ? t.topic.displayName || t.topic.name || t.topic.id
          : (t.topic as string);
      return topicName === trapTopicFilter;
    });
  }, [filteredTraps, trapTopicFilter]);

  const yearOptions = useMemo(() => {
    if (!report?.metadata?.yearRange) return [];
    const min = report.metadata.yearRange.min;
    const max = report.metadata.yearRange.max;
    if (!min || !max || max < min) return [];
    return Array.from({ length: max - min + 1 }, (_, idx) => String(min + idx));
  }, [report?.metadata?.yearRange?.max, report?.metadata?.yearRange?.min]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load exam intelligence report: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!report) {
    return (
      <Alert>
        <AlertDescription>
          No analyzed exam questions found. Analyze questions to generate
          report.
        </AlertDescription>
      </Alert>
    );
  }

  const handleViewTopicDetails = (topicName: string) => {
    router.push(`/topics`);
  };

  const buildReportUrl = () => {
    const params = new URLSearchParams();
    if (selectedLesson && selectedLesson !== "all") {
      params.set("lesson", selectedLesson);
    }
    if (startYear !== "all") {
      params.set("startYear", startYear);
    }
    if (endYear !== "all") {
      params.set("endYear", endYear);
    }
    const query = params.toString();
    return `${backendUrl}/admin/exam-intelligence/report${query ? `?${query}` : ""}`;
  };

  const handleRecalculate = async () => {
    setFilterError(null);
    const start = startYear !== "all" ? Number(startYear) : undefined;
    const end = endYear !== "all" ? Number(endYear) : undefined;
    if (start && end && start > end) {
      setFilterError("Başlangıç yılı, bitiş yılından büyük olamaz.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(buildReportUrl(), { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch report: ${response.statusText}`);
      }
      const data = await response.json();
      setReport(data.report);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Unknown error";
      setFilterError(`Rapor alınamadı: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions

  const getRiskColor = (risk: string) => {
    if (risk === "HIGH") return "border-red-500 bg-red-50";
    if (risk === "MEDIUM") return "border-yellow-500 bg-yellow-50";
    return "border-gray-300 bg-gray-50";
  };

  const getPriorityColor = (priority: string) => {
    if (priority === "HIGH") return "bg-red-600";
    if (priority === "MEDIUM") return "bg-yellow-600";
    return "bg-gray-500";
  };

  const getStrengthColor = (strength: string) => {
    if (strength === "STRONG") return "bg-purple-600";
    if (strength === "MEDIUM") return "bg-blue-600";
    return "bg-gray-400";
  };

  // Top 3 calculations
  const topTopics = report.topicPatternMatrix
    .sort((a, b) => b.totalQuestions - a.totalQuestions)
    .slice(0, 3);

  const topPatterns = report.patternFrequency.slice(0, 3);

  const strongestPrerequisite = report.prerequisiteImpact.sort(
    (a, b) => b.examImportance - a.examImportance,
  )[0];

  const highestRiskTrap =
    report.trapHotspots?.filter((t) => t.riskLevel === "HIGH")[0] ||
    report.trapHotspots?.[0];

  return (
    <div className="space-y-6">
      {/* 1️⃣ HEADER - Global Controls */}
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Exam Intelligence Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Curriculum decision support based on{" "}
            {report.metadata.totalQuestionsAnalyzed} analyzed questions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Lesson:</span>
            <Select value={selectedLesson} onValueChange={setSelectedLesson}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {report.metadata.lessons.map((lesson) => (
                  <SelectItem key={lesson} value={lesson}>
                    {lesson}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Years:</span>
            <Select value={startYear} onValueChange={setStartYear}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Start" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={`start-${year}`} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">–</span>
            <Select value={endYear} onValueChange={setEndYear}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="End" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={`end-${year}`} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isLoading ? "Loading..." : "Recalculate"}
          </Button>
        </div>
      </div>

      <div className="text-xs text-gray-500 flex items-center gap-3">
        <span>
          Last generated:{" "}
          {new Date(report.metadata.generatedAt).toLocaleString()}
        </span>
        {filterError && (
          <span className="text-red-600 font-medium">{filterError}</span>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2 border-b pb-2">
          {[
            { key: "executive", label: "Executive Summary" },
            { key: "yearly", label: "Yearly Trends" },
            { key: "matrix", label: "Topic-Pattern Matrix" },
            { key: "prereq", label: "Prerequisite Impact" },
            { key: "traps", label: "Trap Hotspots" },
            { key: "content", label: "Content Recommendations" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`text-sm px-3 py-1 rounded-t-md -mb-px focus:outline-none ${
                activeTab === tab.key
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2️⃣ EXECUTIVE SUMMARY - Clickable Key Metrics */}
      {activeTab === "executive" && (
        <div className="grid grid-cols-5 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-medium">
                Questions Analyzed
              </CardDescription>
              <CardTitle className="text-3xl">
                {report.metadata.totalQuestionsAnalyzed}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-gray-500">
                {report.metadata.yearRange.min}–{report.metadata.yearRange.max}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-medium">
                Top Topic
              </CardDescription>
              <CardTitle className="text-lg">
                {topTopics[0]?.topic || "N/A"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-gray-500">
                {topTopics[0]?.totalQuestions || 0} questions
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-medium">
                Top Pattern
              </CardDescription>
              <CardTitle className="text-sm">
                {topPatterns[0]?.pattern || "N/A"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-gray-500">
                {topPatterns[0]?.percentage.toFixed(1)}% of questions
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-medium">
                Critical Prerequisite
              </CardDescription>
              <CardTitle className="text-sm">
                {strongestPrerequisite?.prerequisite || "N/A"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-1">
                <span
                  className={`px-2 py-0.5 rounded text-xs text-white ${getStrengthColor(strongestPrerequisite?.strength || "WEAK")}`}
                >
                  {strongestPrerequisite?.strength || "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-600" />
                Highest Risk Trap
              </CardDescription>
              <CardTitle className="text-sm text-red-900">
                {highestRiskTrap?.topic
                  ? typeof highestRiskTrap.topic === "string"
                    ? highestRiskTrap.topic
                    : highestRiskTrap.topic.displayName ||
                      highestRiskTrap.topic.name ||
                      highestRiskTrap.topic.id
                  : "None"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-red-600 font-medium">
                {highestRiskTrap?.riskLevel || "N/A"} RISK
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3️⃣ YEARLY TREND VIEW */}
      {activeTab === "yearly" && (
        <Card>
          <CardHeader>
            <CardTitle>Yearly Exam Trends</CardTitle>
            <CardDescription>
              Question distribution and pattern emergence over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.yearlyTrends.map((year) => (
                <div
                  key={year.year}
                  className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold">{year.year}</h3>
                      <Badge variant="outline">
                        {year.totalQuestions} questions
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Top Patterns</p>
                      <div className="space-y-1">
                        {year.topPatterns.slice(0, 3).map((pattern, idx) => (
                          <div
                            key={idx}
                            className="text-sm flex items-center justify-between"
                          >
                            <span className="truncate ">
                              {pattern.patternType}
                            </span>
                            <span className="text-gray-500 text-xs ml-2">
                              {pattern.count}×
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Top Topics</p>
                      <div className="space-y-1">
                        {year.topTopics.slice(0, 3).map((topic, idx) => (
                          <div
                            key={idx}
                            className="text-sm flex items-center justify-between"
                          >
                            <span className="truncate">{topic.topic}</span>
                            <span className="text-gray-500 text-xs ml-2">
                              {topic.count}×
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">New Topics</p>
                      {year.newTopics.length > 0 ? (
                        <div className="space-y-1">
                          {year.newTopics.slice(0, 3).map((topic, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs mr-1"
                            >
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">None</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4️⃣ TOPIC-PATTERN MATRIX */}
      {activeTab === "matrix" && (
        <Card>
          <CardHeader>
            <CardTitle>Topic-Pattern Coverage Matrix</CardTitle>
            <CardDescription>
              Pattern reliability and frequency per anatomical topic
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-medium">Topic</th>
                    <th className="text-center py-2 px-4 font-medium">
                      Questions
                    </th>
                    <th className="text-left py-2 px-4 font-medium">
                      Most Frequent Pattern
                    </th>
                    <th className="text-center py-2 px-4 font-medium">
                      Reliability
                    </th>
                    <th className="text-center py-2 px-4 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.topicPatternMatrix.map((topic, idx) => {
                    const topPattern = topic.patterns[0];
                    return (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{topic.topic}</td>
                        <td className="text-center py-3 px-4">
                          <Badge variant="outline">
                            {topic.totalQuestions}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {topPattern?.pattern || "N/A"}
                          <span className="text-xs text-gray-500 ml-2">
                            (×{topPattern?.frequency || 0})
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${(topPattern?.reliability || 0) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {((topPattern?.reliability || 0) * 100).toFixed(
                                0,
                              )}
                              %
                            </span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5️⃣ PREREQUISITE IMPACT PANEL */}
      {activeTab === "prereq" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Prerequisite Knowledge Impact</CardTitle>
              <CardDescription>
                Essential foundations ranked by exam importance
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Concept-linked only
              </Button>
              <Button variant="outline" size="sm">
                Needs mapping
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.prerequisiteImpact
                .sort((a, b) => b.examImportance - a.examImportance)
                .map((prereq, idx) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-base">
                          {prereq.prerequisite}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Linked to {prereq.linkedTopics.length} topics •
                          Appears {prereq.frequency} times
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge
                          className={`${getStrengthColor(prereq.strength)} text-white`}
                        >
                          {prereq.strength}
                        </Badge>
                        <Badge variant="outline">
                          {prereq.examImportance}% importance
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {prereq.linkedTopics.slice(0, 8).map((topic, tidx) => (
                        <Badge
                          key={tidx}
                          variant="secondary"
                          className="text-xs"
                        >
                          {topic}
                        </Badge>
                      ))}
                      {prereq.linkedTopics.length > 8 && (
                        <Badge variant="secondary" className="text-xs">
                          +{prereq.linkedTopics.length - 8} more
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          router.push("/prerequisites/" + prereq.id);
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        Merge Prerequisites
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6️⃣ TRAP HOTSPOTS */}
      {activeTab === "traps" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle>Trap Hotspots & Confusion Areas</CardTitle>
            </div>
            <CardDescription>
              High-risk conceptual traps requiring student awareness
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-gray-600">Lesson:</span>
              <Select
                value={trapLessonFilter}
                onValueChange={setTrapLessonFilter}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {report.metadata.lessons.map((lesson) => (
                    <SelectItem key={lesson} value={lesson}>
                      {lesson}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-sm text-gray-600">Topic:</span>
              <Select
                value={trapTopicFilter}
                onValueChange={setTrapTopicFilter}
              >
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {topicOptions.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!filteredTrapsWithTopic || filteredTrapsWithTopic.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">No trap hotspots identified</p>
                <p className="text-sm mt-1">
                  No trap hotspots match the selected lesson/topic or there is
                  no trap analysis data yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTrapsWithTopic.map((trap, idx) => {
                  // Defensive rendering for trap.topic
                  let topicDisplay = trap.topic;
                  if (typeof trap.topic === "object" && trap.topic !== null) {
                    topicDisplay =
                      trap.topic.displayName ||
                      trap.topic.name ||
                      trap.topic.id ||
                      JSON.stringify(trap.topic);
                  }
                  let trapTypeDisplay = trap.trapType;
                  if (
                    typeof trap.trapType === "object" &&
                    trap.trapType !== null
                  ) {
                    trapTypeDisplay =
                      trap.trapType.displayName ||
                      trap.trapType.name ||
                      trap.trapType.id ||
                      JSON.stringify(trap.trapType);
                  }
                  return (
                    <div
                      key={idx}
                      className={`border-2 rounded-lg p-4 ${getRiskColor(trap.riskLevel)}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-base">
                            {topicDisplay as string}
                          </h4>
                          <p className="text-sm text-gray-700 mt-1">
                            {trapTypeDisplay as string}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge
                            className={`${getPriorityColor(trap.riskLevel)} text-white`}
                          >
                            {trap.riskLevel} RISK
                          </Badge>
                          <Badge variant="outline">×{trap.frequency}</Badge>
                        </div>
                      </div>

                      {trap.confusionPairs.length > 0 && (
                        <div className="space-y-2 mt-3">
                          <p className="text-sm font-medium text-gray-800">
                            Common Confusions:
                          </p>
                          {trap.confusionPairs.map((pair, pidx) => {
                            let concept1Display = pair.concept1;
                            if (
                              typeof pair.concept1 === "object" &&
                              pair.concept1 !== null
                            ) {
                              concept1Display =
                                pair.concept1.displayName ||
                                pair.concept1.name ||
                                pair.concept1.id ||
                                JSON.stringify(pair.concept1);
                            }
                            let concept2Display = pair.concept2;
                            if (
                              typeof pair.concept2 === "object" &&
                              pair.concept2 !== null
                            ) {
                              concept2Display =
                                pair.concept2.displayName ||
                                pair.concept2.name ||
                                pair.concept2.id ||
                                JSON.stringify(pair.concept2);
                            }
                            const differentiatorDisplay =
                              pair.differentiator as string;

                            return (
                              <div
                                key={pidx}
                                className="bg-white border rounded p-3 text-sm"
                              >
                                <div className="flex items-center gap-2 font-medium">
                                  <span>{concept1Display as string}</span>
                                  <span className="text-gray-400">⟷</span>
                                  <span>{concept2Display as string}</span>
                                </div>
                                {differentiatorDisplay && (
                                  <p className="text-xs text-gray-600 mt-2 pl-4 border-l-2 border-gray-300">
                                    <span className="font-medium">
                                      Key difference:
                                    </span>{" "}
                                    {differentiatorDisplay as string}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() =>
                          console.log(
                            "Navigate to example questions for",
                            topicDisplay,
                          )
                        }
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Example Questions
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 7️⃣ CONTENT RECOMMENDATIONS */}
      {activeTab === "content" && (
        <Card>
          <CardHeader>
            <CardTitle>Actionable Content Recommendations</CardTitle>
            <CardDescription>
              Strategic gaps requiring immediate content creation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Group by type */}
              {["FLASHCARD", "QUESTION", "PREREQUISITE"].map((type) => {
                const recs = report.contentRecommendations.filter(
                  (r) => r.type === type,
                );
                if (recs.length === 0) return null;

                return (
                  <div key={type} className="space-y-3">
                    <h3 className="font-semibold text-sm text-gray-700 uppercase">
                      {type} Needs ({recs.length})
                    </h3>
                    {recs.map((rec, idx) => (
                      <div
                        key={idx}
                        className={`border-l-4 rounded-lg p-4 ${
                          rec.priority === "HIGH"
                            ? "border-red-500 bg-red-50"
                            : rec.priority === "MEDIUM"
                              ? "border-yellow-500 bg-yellow-50"
                              : "border-gray-300 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                className={`${getPriorityColor(rec.priority)} text-white text-xs`}
                              >
                                {rec.priority}
                              </Badge>
                              <h4 className="font-semibold text-base">
                                {rec.topicName || rec.topic}
                              </h4>
                            </div>
                            <p className="text-sm text-gray-700">
                              {rec.reasoning}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                          <div className="bg-white border rounded p-2">
                            <p className="text-gray-500">Exam Frequency</p>
                            <p className="font-bold text-lg">
                              {rec.metrics.examFrequency}
                            </p>
                          </div>
                          <div className="bg-white border rounded p-2">
                            <p className="text-gray-500">Current Coverage</p>
                            <p className="font-bold text-lg">
                              {rec.metrics.currentCoverage}
                            </p>
                          </div>
                          <div className="bg-white border rounded p-2">
                            <p className="text-gray-500">Coverage Gap</p>
                            <p className="font-bold text-lg text-red-600">
                              {rec.metrics.gap}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                          {rec.type === "FLASHCARD" && (
                            <Button size="sm" className="bg-blue-600">
                              Create Flashcard
                            </Button>
                          )}
                          {rec.type === "QUESTION" && (
                            <Button size="sm" className="bg-green-600">
                              Generate Questions
                            </Button>
                          )}
                          {rec.type === "PREREQUISITE" && (
                            <Button size="sm" className="bg-purple-600">
                              Review Coverage
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleViewTopicDetails(rec.topicName || rec.topic)
                            }
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Topic Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
