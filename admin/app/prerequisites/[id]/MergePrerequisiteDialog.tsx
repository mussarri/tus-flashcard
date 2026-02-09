"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitMerge, Search, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SearchResult {
  id: string;
  name: string;
  canonicalKey: string;
  _count?: {
    edges: number;
    concepts: number;
  };
}

interface MergeCandidate {
  prerequisiteId: string;
  name: string;
  similarityScore: number;
  reasons: string[];
}

type DisplayCandidate = (SearchResult | MergeCandidate) & {
  id?: string;
  prerequisiteId?: string;
  similarityScore?: number;
  reasons?: string[];
  totalFrequency?: number;
  linkedConcepts?: Array<{ conceptId: string }>;
  _count?: {
    edges: number;
    concepts: number;
  };
}

interface MergePrerequisiteDialogProps {
  prerequisite: {
    id: string;
    name: string;
    totalFrequency: number;
    linkedConcepts: Array<{
      conceptId: string;
      preferredLabel: string;
    }>;
    mergeCandidates: Array<{
      prerequisiteId: string;
      name: string;
      similarityScore: number;
      reasons: string[];
    }>;
  };
  initialSelectedId?: string | null;
  onClose: () => void;
  onComplete: () => void;
}

export function MergePrerequisiteDialog({
  prerequisite,
  initialSelectedId,
  onClose,
  onComplete,
}: MergePrerequisiteDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DisplayCandidate[]>([]);
  const [selectedPrerequisiteId, setSelectedPrerequisiteId] = useState<
    string | null
  >(initialSelectedId || null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchPrerequisites = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/admin/prerequisites/search?q=${encodeURIComponent(searchQuery)}`,
        );
        if (response.ok) {
          const data = await response.json();
          // Filter out the current prerequisite
          setSearchResults(
            data.prerequisites.filter(
              (p: SearchResult) => p.id !== prerequisite.id,
            ),
          );
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchPrerequisites, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, prerequisite.id]);

  const handleMerge = async () => {
    if (!selectedPrerequisiteId) {
      setError("Please select a prerequisite to merge with");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/prerequisites/${prerequisite.id}/merge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetPrerequisiteId: selectedPrerequisiteId,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to merge prerequisites");
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayResults =
    searchQuery.trim() === "" ? prerequisite.mergeCandidates : searchResults;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Merge Prerequisite</DialogTitle>
          <DialogDescription>
            Merge &quot;{prerequisite.name}&quot; into another prerequisite. All linked
            questions will be transferred.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action will delete the current
              prerequisite and transfer all its questions to the selected target
              prerequisite. This cannot be undone.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="search">Search for Target Prerequisite</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
                className="pl-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>
            <p className="text-xs text-gray-500">
              {searchQuery.trim() === ""
                ? "Showing suggested merge candidates based on similarity"
                : "Search results"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>
              Select Target Prerequisite{" "}
              <span className="text-red-500">*</span>
            </Label>
            {displayResults.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                {searchQuery.trim() === ""
                  ? "No merge candidates found"
                  : "No results found"}
              </p>
            ) : (
              <RadioGroup
                value={selectedPrerequisiteId || ""}
                onValueChange={setSelectedPrerequisiteId}
              >
                <div className="space-y-2">
                  {displayResults.map((candidate: DisplayCandidate) => {
                    const candidateId = ('prerequisiteId' in candidate && candidate.prerequisiteId) || ('id' in candidate && candidate.id) || '';
                    return (
                    <div
                      key={candidateId}
                      className="flex items-start space-x-2 border rounded-lg p-3 hover:bg-gray-50"
                    >
                      <RadioGroupItem
                        value={candidateId}
                        id={candidateId}
                        className="mt-1"
                      />
                      <label
                        htmlFor={candidateId}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">{candidate.name}</p>
                          <div className="flex gap-2">
                            {candidate.similarityScore && (
                              <Badge variant="secondary">
                                {(candidate.similarityScore * 100).toFixed(0)}%
                                similar
                              </Badge>
                            )}
                            {candidate._count && (
                              <Badge variant="outline">
                                {candidate._count.edges} edges
                              </Badge>
                            )}
                            {candidate._count && (
                              <Badge variant="outline">
                                {candidate._count.concepts} concepts
                              </Badge>
                            )}
                          </div>
                        </div>
                        {candidate.reasons && candidate.reasons.length > 0 && (
                          <div className="text-xs text-gray-600 space-y-1">
                            {candidate.reasons.map((reason: string, idx: number) => (
                              <p key={idx}>• {reason}</p>
                            ))}
                          </div>
                        )}
                      </label>
                    </div>
                  );})}
                </div>
              </RadioGroup>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            İptal
          </Button>
          <Button
            onClick={handleMerge}
            disabled={isSubmitting || !selectedPrerequisiteId}
            variant="destructive"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <GitMerge className="mr-2 h-4 w-4" />
            Merge Prerequisites
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
