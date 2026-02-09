/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/api";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Link as LinkIcon,
} from "lucide-react";
import { ConceptRulesDialog } from "../concepts/DecisionDialog";

interface UnresolvedHint {
  id: string;
  hint: string;
  lesson: string;
  topic?: string;
  subtopic?: string;
  count: number;
  status: "PENDING" | "RESOLVED" | "IGNORED";
  createdAt: string;
}

interface Statistics {
  totalPending: number;
  totalResolved: number;
  totalIgnored: number;
  byLesson: Array<{
    lesson: string;
    hintCount: number;
    totalOccurrences: number;
  }>;
  topHints: Array<{
    id: string;
    hint: string;
    lesson: string;
    count: number;
  }>;
}

interface Concept {
  id: string;
  preferredLabel: string;
  conceptType: string;
}

const CONCEPT_TYPES = [
  "NERVE",
  "MUSCLE",
  "VESSEL",
  "STRUCTURE",
  "ORGAN",
  "BONE",
  "JOINT",
  "LIGAMENT",
  "SPACE",
  "FORAMEN",
];

const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  IGNORED: "bg-gray-100 text-gray-600",
};

export default function UnresolvedHintsView() {
  const [hints, setHints] = useState<UnresolvedHint[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHint, setSelectedHint] = useState<UnresolvedHint | null>(null);
  const [actionMode, setActionMode] = useState<
    "create" | "alias" | "ignore" | "bulk-approve" | null
  >(null);

  // Bulk selection
  const [selectedHintIds, setSelectedHintIds] = useState<Set<string>>(new Set());

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [lessonFilter, setLessonFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Concept Form
  const [preferredLabel, setPreferredLabel] = useState("");
  const [conceptType, setConceptType] = useState<string>("STRUCTURE");
  const [description, setDescription] = useState("");
  const [additionalAliases, setAdditionalAliases] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState("");

  // Add Alias Form
  const [conceptSearch, setConceptSearch] = useState("");
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [conceptSearchResults, setConceptSearchResults] = useState<Concept[]>(
    [],
  );

  // Ignore Form
  const [ignoreReason, setIgnoreReason] = useState("");

  useEffect(() => {
    fetchData();
  }, [statusFilter, lessonFilter]);

  // Debounced search for concepts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (conceptSearch.length >= 2) {
        searchConcepts(conceptSearch);
      } else {
        setConceptSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [conceptSearch]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (lessonFilter) params.append("lesson", lessonFilter);

      const [hintsData, statsData] = await Promise.all([
        apiRequest<{ hints: UnresolvedHint[]; total: number }>(
          `admin/unresolved-hints?${params.toString()}`,
        ),
        apiRequest<Statistics>(`admin/unresolved-hints/statistics`),
      ]);

      setHints(hintsData.hints);
      setStatistics(statsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };
  const searchConcepts = async (query: string) => {
    if (query.length < 2) {
      setConceptSearchResults([]);
      return;
    }

    try {
      const data = await apiRequest<{ concepts: Concept[] }>(
        `admin/concepts/search?q=${encodeURIComponent(query)}`,
      );
      setConceptSearchResults(data.concepts);
    } catch (error) {
      console.error("Failed to search concepts:", error);
    }
  };

  const handleCreateConcept = async () => {
    if (!selectedHint || !preferredLabel || !conceptType) return;

    try {
      await apiRequest(
        `admin/unresolved-hints/${selectedHint.id}/create-concept`,
        {
          method: "POST",
          body: JSON.stringify({
            preferredLabel,
            conceptType,
            description: description || undefined,
            additionalAliases:
              additionalAliases.length > 0 ? additionalAliases : undefined,
          }),
        },
      );

      closeDialog();
      fetchData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleAddAlias = async () => {
    if (!selectedHint || !selectedConcept) return;

    try {
      await apiRequest(`admin/unresolved-hints/${selectedHint.id}/add-alias`, {
        method: "POST",
        body: JSON.stringify({
          conceptId: selectedConcept.id,
        }),
      });

      closeDialog();
      fetchData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleIgnore = async () => {
    if (!selectedHint) return;

    try {
      await apiRequest(`admin/unresolved-hints/${selectedHint.id}/ignore`, {
        method: "PATCH",
        body: JSON.stringify({
          reason: ignoreReason || undefined,
        }),
      });

      closeDialog();
      fetchData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleBulkIgnore = async () => {
    if (selectedHintIds.size === 0) return;

    if (!confirm(`Are you sure you want to ignore ${selectedHintIds.size} hints?`)) {
      return;
    }

    try {
      await apiRequest("admin/unresolved-hints/bulk-ignore", {
        method: "POST",
        body: JSON.stringify({
          hintIds: Array.from(selectedHintIds),
          reason: "Bulk ignored by admin",
        }),
      });

      setSelectedHintIds(new Set());
      fetchData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedHintIds.size === 0) return;

    // Open bulk approve dialog
    setActionMode("bulk-approve");
    setConceptSearch("");
    setSelectedConcept(null);
    setConceptSearchResults([]);
  };

  const handleBulkApproveSubmit = async () => {
    if (!selectedConcept || selectedHintIds.size === 0) return;

    try {
      const result = await apiRequest("admin/unresolved-hints/bulk-approve", {
        method: "POST",
        body: JSON.stringify({
          hintIds: Array.from(selectedHintIds),
          conceptId: selectedConcept.id,
        }),
      });

      alert(
        `Successfully approved ${result.addedAliases} hints as aliases to "${result.conceptLabel}". ` +
        `Skipped ${result.skippedDuplicates} duplicates. ` +
        `Linked ${result.linkedQuestions} questions.`
      );

      setSelectedHintIds(new Set());
      closeDialog();
      fetchData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const toggleHintSelection = (hintId: string) => {
    const newSelection = new Set(selectedHintIds);
    if (newSelection.has(hintId)) {
      newSelection.delete(hintId);
    } else {
      newSelection.add(hintId);
    }
    setSelectedHintIds(newSelection);
  };

  const toggleSelectAll = () => {
    const pendingHints = filteredHints.filter(h => h.status === "PENDING");
    if (selectedHintIds.size === pendingHints.length) {
      setSelectedHintIds(new Set());
    } else {
      setSelectedHintIds(new Set(pendingHints.map(h => h.id)));
    }
  };

  const openCreateDialog = (hint: UnresolvedHint) => {
    setSelectedHint(hint);
    setActionMode("create");
    setPreferredLabel(hint.hint);
    setConceptType("STRUCTURE");
    setDescription("");
    setAdditionalAliases([]);
  };

  const openAliasDialog = (hint: UnresolvedHint) => {
    setSelectedHint(hint);
    setActionMode("alias");
    setConceptSearch("");
    setSelectedConcept(null);
    setConceptSearchResults([]);
  };

  const openIgnoreDialog = (hint: UnresolvedHint) => {
    setSelectedHint(hint);
    setActionMode("ignore");
    setIgnoreReason("");
  };

  const closeDialog = () => {
    setSelectedHint(null);
    setActionMode(null);
  };

  const addAlias = () => {
    if (aliasInput.trim() && !additionalAliases.includes(aliasInput.trim())) {
      setAdditionalAliases([...additionalAliases, aliasInput.trim()]);
      setAliasInput("");
    }
  };

  const removeAlias = (alias: string) => {
    setAdditionalAliases(additionalAliases.filter((a) => a !== alias));
  };

  const filteredHints = hints.filter((hint) =>
    hint.hint.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Unresolved Concept Hints</h1>
        <p className="text-gray-600 mt-1">
          Manage concept hints that couldn&lsquo;t be automatically resolved
        </p>
      </div>

      <ConceptRulesDialog />

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <h3 className="text-sm font-medium text-yellow-900">Pending</h3>
            </div>
            <p className="text-2xl font-bold text-yellow-900 mt-2">
              {statistics.totalPending}
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="text-sm font-medium text-green-900">Resolved</h3>
            </div>
            <p className="text-2xl font-bold text-green-900 mt-2">
              {statistics.totalResolved}
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900">Ignored</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {statistics.totalIgnored}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900">Top Lesson</h3>
            <p className="text-lg font-bold text-blue-900 mt-2">
              {statistics.byLesson[0]?.lesson || "N/A"}
            </p>
            <p className="text-xs text-blue-700">
              {statistics.byLesson[0]?.hintCount || 0} hints
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search hints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="IGNORED">Ignored</SelectItem>
          </SelectContent>
        </Select>

        {statistics && (
          <Select value={lessonFilter} onValueChange={setLessonFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Lessons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Lessons</SelectItem>
              {statistics.byLesson.map((item) => (
                <SelectItem key={item.lesson} value={item.lesson}>
                  {item.lesson} ({item.hintCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {selectedHintIds.size > 0 && (
          <>
            <Button
              onClick={handleBulkApprove}
              className="flex items-center gap-2"
            >
              <LinkIcon className="w-4 h-4" />
              Approve Selected ({selectedHintIds.size})
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkIgnore}
              className="flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Ignore Selected ({selectedHintIds.size})
            </Button>
          </>
        )}
      </div>

      {/* Hints Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {statusFilter === "PENDING" && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedHintIds.size > 0 && selectedHintIds.size === filteredHints.filter(h => h.status === "PENDING").length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead>Hint</TableHead>
              <TableHead>Lesson</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead className="text-center">Count</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredHints.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={statusFilter === "PENDING" ? 7 : 6}
                  className="text-center py-8 text-gray-500"
                >
                  No hints found
                </TableCell>
              </TableRow>
            ) : (
              filteredHints.map((hint) => (
                <TableRow key={hint.id}>
                  {statusFilter === "PENDING" && hint.status === "PENDING" && (
                    <TableCell>
                      <Checkbox
                        checked={selectedHintIds.has(hint.id)}
                        onCheckedChange={() => toggleHintSelection(hint.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{hint.hint}</TableCell>
                  <TableCell>{hint.lesson}</TableCell>
                  <TableCell>{hint.topic || "-"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{hint.count}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[hint.status]}>
                      {hint.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {hint.status === "PENDING" && (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCreateDialog(hint)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Create
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAliasDialog(hint)}
                        >
                          <LinkIcon className="w-4 h-4 mr-1" />
                          Link
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openIgnoreDialog(hint)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Ignore
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Concept Dialog */}
      <Dialog open={actionMode === "create"} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Concept</DialogTitle>
            <DialogDescription>
              Create a new concept from hint:{" "}
              <strong>{selectedHint?.hint}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label>Preferred Label</Label>
            <Input
              value={preferredLabel}
              onChange={(e: any) => setPreferredLabel(e.target.value)}
              placeholder="Enter preferred label"
            />

            {conceptType && (
              <div className="space-y-2">
                <Label>Concept Type</Label>
                <Select value={conceptType} onValueChange={setConceptType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select concept type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONCEPT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={description}
                onChange={(e: any) => setDescription(e.target.value)}
                placeholder="Enter description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Aliases (Optional)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={aliasInput}
                  onChange={(e: any) => setAliasInput(e.target.value)}
                  placeholder="Add alias"
                  onKeyDown={(e: any) =>
                    e.key === "Enter" && (e.preventDefault(), addAlias())
                  }
                />
                <Button type="button" onClick={addAlias}>
                  Add
                </Button>
              </div>
              {additionalAliases.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {additionalAliases.map((alias) => (
                    <Badge key={alias} variant="secondary">
                      {alias}
                      <button
                        className="ml-2 hover:text-red-600"
                        onClick={() => removeAlias(alias)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleCreateConcept}>Create Concept</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Alias Dialog */}
      <Dialog open={actionMode === "alias"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add as Alias to Existing Concept</DialogTitle>
            <DialogDescription>
              Link hint &quot;<strong>{selectedHint?.hint}</strong>&quot; to an
              existing concept
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Search Concept</Label>
              <Input
                value={conceptSearch}
                onChange={(e: any) => {
                  setConceptSearch(e.target.value);
                  searchConcepts(e.target.value);
                }}
                placeholder="Type to search concepts..."
              />
            </div>

            {conceptSearchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {conceptSearchResults.map((concept) => (
                  <button
                    key={concept.id}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition ${
                      selectedConcept?.id === concept.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedConcept(concept)}
                  >
                    <div className="font-medium">{concept.preferredLabel}</div>
                    <div className="text-sm text-gray-500">
                      {concept.conceptType}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedConcept && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-900">Selected Concept:</div>
                <div className="font-medium text-blue-900">
                  {selectedConcept.preferredLabel}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleAddAlias} disabled={!selectedConcept}>
              Add Alias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ignore Dialog */}
      <Dialog open={actionMode === "ignore"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ignore Hint</DialogTitle>
            <DialogDescription>
              Mark hint &quot;<strong>{selectedHint?.hint}</strong>&quot; as
              ignored
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label>Reason (Optional)</Label>
            <Textarea
              value={ignoreReason}
              onChange={(e: any) => setIgnoreReason(e.target.value)}
              placeholder="Why is this hint being ignored?"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleIgnore} variant="destructive">
              Ignore Hint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Approve Dialog */}
      <Dialog open={actionMode === "bulk-approve"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Approve as Aliases</DialogTitle>
            <DialogDescription>
              Link {selectedHintIds.size} selected hints to an existing concept
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Search Concept</Label>
              <Input
                value={conceptSearch}
                onChange={(e: any) => {
                  setConceptSearch(e.target.value);
                  searchConcepts(e.target.value);
                }}
                placeholder="Type to search concepts..."
              />
            </div>

            {conceptSearchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {conceptSearchResults.map((concept) => (
                  <button
                    key={concept.id}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition ${
                      selectedConcept?.id === concept.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedConcept(concept)}
                  >
                    <div className="font-medium">{concept.preferredLabel}</div>
                    <div className="text-sm text-gray-500">
                      {concept.conceptType}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedConcept && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-900">Selected Concept:</div>
                <div className="font-medium text-blue-900">
                  {selectedConcept.preferredLabel}
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  {selectedHintIds.size} hints will be added as aliases
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkApproveSubmit} 
              disabled={!selectedConcept}
            >
              Approve All as Aliases
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}
