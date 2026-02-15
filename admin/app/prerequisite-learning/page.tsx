/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  BookOpen,
  Target,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  Merge,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PrerequisiteMergeDialog } from "./PrerequisiteMergeDialog";
import { PrerequisiteReviewDialog } from "./PrerequisiteReviewDialog";

interface PrerequisiteAnalytics {
  totalPrerequisites: number;
  totalTopics: number;
  totalEdges: number;
  edgesByStrength: {
    STRONG: number;
    MEDIUM: number;
    WEAK: number;
  };
  avgPrerequisitesPerTopic: number;
  topPrerequisites: Array<{
    name: string;
    topicCount: number;
    strongEdgeCount: number;
  }>;
  topicsWithMissingStrongPrerequisites: Array<{
    name: string;
    prerequisiteCount: number;
    strongPrerequisiteCount: number;
  }>;
}

interface PrerequisiteDetail {
  id: string;
  name: string;
  createdAt: string;
  status: "ACTIVE" | "NEEDS_REVIEW" | "DEPRECATED";
  reviewReason?: string | null;
  concepts?: Array<{
    id: string;
    preferredLabel: string;
  }>;
  edges: Array<{
    topic: {
      name: string;
    };
    subtopic?: string | null;
    frequency: number;
    strength: "WEAK" | "MEDIUM" | "STRONG";
  }>;
}

interface TopicDetail {
  id: string;
  name: string;
  lesson: string;
  edges: Array<{
    prerequisite: {
      name: string;
    };
    frequency: number;
    strength: "WEAK" | "MEDIUM" | "STRONG";
  }>;
}

export default function PrerequisiteLearningPage() {
  const [analytics, setAnalytics] = useState<PrerequisiteAnalytics | null>(
    null,
  );
  const [prerequisites, setPrerequisites] = useState<PrerequisiteDetail[]>([]);
  const [topics, setTopics] = useState<TopicDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPrerequisites, setLoadingPrerequisites] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
   // Pagination from backend
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Merge functionality
  const [selectedPrerequisiteIds, setSelectedPrerequisiteIds] = useState<
    string[]
  >([]);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [reviewPrerequisite, setReviewPrerequisite] = useState<PrerequisiteDetail | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [strengthFilter, setStrengthFilter] = useState<
    "ALL" | "STRONG" | "MEDIUM" | "WEAK"
  >("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "NEEDS_REVIEW" | "DEPRECATED"
  >("ALL");
  const [minFrequency, setMinFrequency] = useState<number>(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sorting
  const [sortBy, setSortBy] = useState<"name" | "edges" | "concepts" | "date">(
    "name",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ analytics: PrerequisiteAnalytics }>(
        "admin/prerequisite-learning/analytics",
      );
      setAnalytics(data.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPrerequisites = useCallback(async () => {
    try {
      setLoadingPrerequisites(true);

      // Build query params
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy,
        sortOrder,
      });

      if (searchTerm) {
        params.append("search", searchTerm);
      }
      if (strengthFilter !== "ALL") {
        params.append("strengthFilter", strengthFilter);
      }
      if (statusFilter !== "ALL") {
        params.append("statusFilter", statusFilter);
      }
      if (minFrequency > 0) {
        params.append("minFrequency", minFrequency.toString());
      }

      const data = await apiRequest<{
        prerequisites: PrerequisiteDetail[];
        pagination: { total: number; totalPages: number };
      }>(`admin/prerequisite-learning/prerequisites?${params.toString()}`);
      console.log(data.prerequisites);

      setPrerequisites(data.prerequisites || []);
      setTotalItems(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch prerequisites:", err);
    } finally {
      setLoadingPrerequisites(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    sortBy,
    sortOrder,
    searchTerm,
    strengthFilter,
    statusFilter,
    minFrequency,
  ]);

  const fetchAllTopics = async () => {
    try {
      // Fetch all topics from dedicated endpoint
      const data = await apiRequest<{ topics: any[] }>(
        "admin/prerequisite-learning/topics",
      );

      // Map the data to match our interface
      const topics = data.topics.map((topic: any) => ({
        id: topic.id,
        name: topic.name,
        lesson: topic.lesson,
        edges: topic.edges,
      }));

      setTopics(topics);
    } catch (err) {
      console.error("Failed to fetch topics:", err);
    }
  };

  const processAllQuestions = async () => {
    try {
      setProcessing(true);
      const result = await apiRequest<{ processed: number }>(
        "admin/prerequisite-learning/process-all",
        {
          method: "POST",
        },
      );
      alert(`Processed ${result.processed} questions successfully`);
      await fetchAnalytics();
      await fetchAllPrerequisites();
      await fetchAllTopics();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchAllTopics();
  }, []);

  // Refetch prerequisites when filters, sorting, or pagination changes
  useEffect(() => {
    fetchAllPrerequisites();
  }, [fetchAllPrerequisites]);

  const filteredTopics = topics.filter((topic) => {
    const matchesSearch = topic.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStrength =
      strengthFilter === "ALL" ||
      topic.edges.some((edge) => edge.strength === strengthFilter);
    const matchesFrequency = topic.edges.some(
      (edge) => edge.frequency >= minFrequency,
    );
    return matchesSearch && matchesStrength && matchesFrequency;
  });

  // Reset to page 1 when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, strengthFilter, statusFilter, minFrequency, sortBy, sortOrder]);

  const getStrengthBadge = (strength: string) => {
    if (strength === "STRONG")
      return <Badge className="bg-purple-600">Strong</Badge>;
    if (strength === "MEDIUM")
      return <Badge className="bg-blue-500">Medium</Badge>;
    return <Badge className="bg-gray-400">Weak</Badge>;
  };

  const getStatusBadge = (status?: string) => {
    if (status === "ACTIVE")
      return <Badge className="bg-green-600">Active</Badge>;
    if (status === "NEEDS_REVIEW")
      return <Badge className="bg-yellow-600">Needs Review</Badge>;
    if (status === "DEPRECATED")
      return <Badge className="bg-red-600">Deprecated</Badge>;
    return <Badge className="bg-gray-500">Unknown</Badge>;
  };

  const togglePrerequisiteSelection = (id: string) => {
    setSelectedPrerequisiteIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );
  };

  const handleMergeClick = () => {
    if (selectedPrerequisiteIds.length < 2) {
      alert("Please select at least 2 prerequisites to merge");
      return;
    }
    setShowMergeDialog(true);
  };

  const handleMergeComplete = () => {
    setSelectedPrerequisiteIds([]);
    fetchAnalytics();
    fetchAllPrerequisites();
    fetchAllTopics();
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading prerequisite analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prerequisite Learning Engine</h1>
          <p className="text-muted-foreground mt-2">
            System learning relationships from analyzed anatomy questions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "NEEDS_REVIEW" ? "default" : "outline"}
            onClick={() => setStatusFilter(statusFilter === "NEEDS_REVIEW" ? "ALL" : "NEEDS_REVIEW")}
            size="sm"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            {statusFilter === "NEEDS_REVIEW" ? "Show All" : "Show Needs Review"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              fetchAnalytics();
              fetchAllPrerequisites();
              fetchAllTopics();
            }}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={processAllQuestions} disabled={processing}>
            <TrendingUp className="h-4 w-4 mr-2" />
            {processing ? "Processing..." : "Process All Questions"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search prerequisites or topics..."
                  className="pl-8 w-full px-3 py-2 border rounded-md"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="NEEDS_REVIEW">Needs Review</option>
                <option value="DEPRECATED">Deprecated</option>
              </select>
            </div>

            {/* Strength Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Strength</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={strengthFilter}
                onChange={(e) => setStrengthFilter(e.target.value as any)}
              >
                <option value="ALL">All Strengths</option>
                <option value="STRONG">Strong (≥10)</option>
                <option value="MEDIUM">Medium (4-9)</option>
                <option value="WEAK">Weak (≤3)</option>
              </select>
            </div>

            {/* Min Frequency */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Min Frequency
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                className="w-full px-3 py-2 border rounded-md"
                value={minFrequency}
                onChange={(e) => setMinFrequency(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Sorting and Pagination Controls */}
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sort By */}
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Sort By
                </label>
                <Select
                  value={sortBy}
                  onValueChange={(value: any) => setSortBy(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="edges">Edge Count</SelectItem>
                    <SelectItem value="concepts">Concept Count</SelectItem>
                    <SelectItem value="date">Date Created</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="text-sm font-medium mb-2 block">Order</label>
                <Select
                  value={sortOrder}
                  onValueChange={(value: any) => setSortOrder(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Items Per Page */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Items Per Page
                </label>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => setItemsPerPage(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(searchTerm || strengthFilter !== "ALL" || statusFilter !== "ALL" || minFrequency > 0) && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">Active filters:</span>
              {searchTerm && (
                <Badge variant="outline">Search: {searchTerm}</Badge>
              )}
              {statusFilter !== "ALL" && (
                <Badge variant="outline">Status: {statusFilter}</Badge>
              )}
              {strengthFilter !== "ALL" && (
                <Badge variant="outline">Strength: {strengthFilter}</Badge>
              )}
              {minFrequency > 0 && (
                <Badge variant="outline">Min Freq: {minFrequency}</Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("ALL");
                  setStrengthFilter("ALL");
                  setMinFrequency(0);
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {analytics && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="prerequisites">
              Prerequisites ({totalItems})
            </TabsTrigger>
            <TabsTrigger value="topics">
              Topics ({filteredTopics.length})
            </TabsTrigger>
            <TabsTrigger value="strength">Edge Strength</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Prerequisites
                  </CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.totalPrerequisites}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Atomic knowledge items
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Topics
                  </CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.totalTopics}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anatomy regions covered
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Edges
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.totalEdges}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Prerequisite relationships
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg Prerequisites/Topic
                  </CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.avgPrerequisitesPerTopic.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Knowledge requirements
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Top Prerequisites */}
            <Card>
              <CardHeader>
                <CardTitle>Top Prerequisites by Coverage</CardTitle>
                <CardDescription>
                  Most frequently required knowledge across all topics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.topPrerequisites.slice(0, 10).map((prereq) => (
                    <div
                      key={prereq.name}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{prereq.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Covers {prereq.topicCount} topics
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            prereq.strongEdgeCount > 0 ? "default" : "secondary"
                          }
                        >
                          {prereq.strongEdgeCount} strong edges
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prerequisites List Tab */}
          <TabsContent value="prerequisites" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Prerequisites</CardTitle>
                    <CardDescription>
                      Complete list of prerequisite knowledge items with their
                      linked topics
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPrerequisiteIds.length > 0 && (
                      <>
                        <Badge variant="secondary">
                          {selectedPrerequisiteIds.length} selected
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPrerequisiteIds([])}
                        >
                          Clear
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={handleMergeClick}
                      disabled={selectedPrerequisiteIds.length < 2}
                      size="sm"
                    >
                      <Merge className="h-4 w-4 mr-2" />
                      Merge Selected
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingPrerequisites ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-600">Loading...</span>
                  </div>
                ) : prerequisites.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No prerequisites found matching your filters
                  </div>
                ) : (
                  <>
                    {/* Results Summary */}
                    <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
                      <span>
                        Showing {(currentPage - 1) * itemsPerPage + 1}-
                        {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                        {totalItems} prerequisites
                      </span>
                      <span>
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>

                    {/* Prerequisites List */}
                    <div className="space-y-4">
                      {prerequisites.map((prereq) => (
                        <div
                          key={prereq.id}
                          className={`border p-4 rounded-lg transition-colors ${
                            selectedPrerequisiteIds.includes(prereq.id)
                              ? "border-purple-500 bg-purple-50"
                              : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedPrerequisiteIds.includes(
                                prereq.id,
                              )}
                              onCheckedChange={() =>
                                togglePrerequisiteSelection(prereq.id)
                              }
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3
                                      className="font-semibold text-lg hover:text-purple-600 cursor-pointer transition-colors"
                                      onClick={() =>
                                        (window.location.href = `/prerequisites/${prereq.id}`)
                                      }
                                    >
                                      {prereq.name}
                                    </h3>
                                    {getStatusBadge(prereq.status)}
                                    {prereq.status === "NEEDS_REVIEW" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="ml-2 text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                                        onClick={() => setReviewPrerequisite(prereq)}
                                      >
                                        Review
                                      </Button>
                                    )}
                                  </div>
                                  
                                  {prereq.reviewReason && (
                                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                      <span className="font-medium">Review reason:</span> {prereq.reviewReason}
                                    </div>
                                  )}
                                  
                                  {prereq.concepts &&
                                    prereq.concepts.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {prereq.concepts.map((concept) => (
                                          <Badge
                                            key={concept.id}
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {concept.preferredLabel}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  <p className="text-sm text-gray-600 mt-1">
                                    Linked to {prereq.edges.length} topics
                                  </p>
                                </div>
                                <Badge>{prereq.edges.length} edges</Badge>
                              </div>

                              {prereq.edges.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-gray-700">
                                    Linked Topics:
                                  </p>
                                  <div className="grid grid-cols-1 gap-2">
                                    {prereq.edges
                                      .slice(0, 5)
                                      .map((edge, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between bg-gray-50 p-2 rounded"
                                        >
                                          <span className="text-sm">
                                            {edge.topic.name}
                                            {edge.subtopic
                                              ? ` · ${edge.subtopic}`
                                              : ""}
                                          </span>
                                          <div className="flex items-center gap-2">
                                            {getStrengthBadge(edge.strength)}
                                            <Badge variant="outline">
                                              ×{edge.frequency}
                                            </Badge>
                                          </div>
                                        </div>
                                      ))}
                                    {prereq.edges.length > 5 && (
                                      <p className="text-xs text-gray-500 text-center">
                                        +{prereq.edges.length - 5} more topics
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    <div className="mt-6 flex items-center justify-between border-t pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>

                      <div className="flex items-center gap-2">
                        {/* Page numbers */}
                        {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = idx + 1;
                          } else if (currentPage <= 3) {
                            pageNum = idx + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + idx;
                          } else {
                            pageNum = currentPage - 2 + idx;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={
                                currentPage === pageNum ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-10"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <span className="text-gray-400">...</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(totalPages)}
                              className="w-10"
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1),
                          )
                        }
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Topics List Tab */}
          <TabsContent value="topics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Topics</CardTitle>
                <CardDescription>
                  Complete list of anatomy topics with their required
                  prerequisites
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredTopics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No topics found matching your filters
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {filteredTopics.map((topic) => (
                      <div key={topic.id} className="border p-4 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {topic.name}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Requires {topic.edges.length} prerequisites
                            </p>
                          </div>
                          <Badge variant="outline">{topic.lesson}</Badge>
                        </div>

                        {topic.edges.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">
                              Required Prerequisites:
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                              {topic.edges.map((edge, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between bg-gray-50 p-2 rounded"
                                >
                                  <span className="text-sm">
                                    {edge.prerequisite.name}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {getStrengthBadge(edge.strength)}
                                    <Badge variant="outline">
                                      ×{edge.frequency}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-700">
                            ⚠️ No prerequisites defined for this topic
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Edge Strength Tab */}
          <TabsContent value="strength" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Edge Strength Distribution</CardTitle>
                <CardDescription>
                  How prerequisite relationships are classified by exam
                  frequency
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-600 rounded"></div>
                      <span className="font-medium">STRONG</span>
                      <span className="text-sm text-muted-foreground">
                        (≥10 questions)
                      </span>
                    </div>
                    <Badge variant="secondary">
                      {analytics.edgesByStrength.STRONG}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="font-medium">MEDIUM</span>
                      <span className="text-sm text-muted-foreground">
                        (4-9 questions)
                      </span>
                    </div>
                    <Badge variant="secondary">
                      {analytics.edgesByStrength.MEDIUM}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-400 rounded"></div>
                      <span className="font-medium">WEAK</span>
                      <span className="text-sm text-muted-foreground">
                        (≤3 questions)
                      </span>
                    </div>
                    <Badge variant="secondary">
                      {analytics.edgesByStrength.WEAK}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Topics Missing Strong Prerequisites</CardTitle>
                <CardDescription>
                  Topics that may need prerequisite learning before advanced
                  content generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topicsWithMissingStrongPrerequisites.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No issues found - all topics have strong prerequisite
                    coverage
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics.topicsWithMissingStrongPrerequisites.map(
                      (topic) => (
                        <div
                          key={topic.name}
                          className="flex items-center justify-between p-4 border border-yellow-200 bg-yellow-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{topic.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {topic.prerequisiteCount} total prerequisites, 0
                              strong
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-yellow-500 text-yellow-700"
                          >
                            Needs Attention
                          </Badge>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Merge Dialog */}
      {selectedPrerequisiteIds.length > 1 && showMergeDialog && (
        <PrerequisiteMergeDialog
          selectedPrerequisiteIds={selectedPrerequisiteIds}
          prerequisites={prerequisites}
          onClose={() => setShowMergeDialog(false)}
          onMergeComplete={handleMergeComplete}
        />
      )}

      {/* Review Dialog */}
      {reviewPrerequisite && (
        <PrerequisiteReviewDialog
          prerequisite={reviewPrerequisite}
          onClose={() => setReviewPrerequisite(null)}
          onActionComplete={() => {
            setReviewPrerequisite(null);
            fetchAnalytics();
            fetchAllPrerequisites();
          }}
        />
      )}
    </div>
  );
}
