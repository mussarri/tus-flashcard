/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Plus, Trash2, CheckCircle, AlertCircle } from "lucide-react";

interface LinkConceptDialogProps {
  prerequisite: {
    id: string;
    name: string;
    linkedConcepts: Array<{
      conceptId: string;
      preferredLabel: string;
      conceptType: string;
      status: string;
    }>;
  };
  onClose: () => void;
  onComplete: () => void;
}

interface Concept {
  id: string;
  preferredLabel: string;
  conceptType: string;
  status: string;
}

export function LinkConceptDialog({
  prerequisite,
  onClose,
  onComplete,
}: LinkConceptDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Concept[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>(
    prerequisite.linkedConcepts.map((c) => c.conceptId),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-search with debouncing
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    const debounce = setTimeout(async () => {
      try {
        const data = await apiRequest<{ concepts: Concept[] }>(
          `admin/concepts/search?q=${encodeURIComponent(searchTerm)}&limit=20`,
        );
        setSearchResults(data.concepts || []);
        setError(null);
      } catch (err) {
        setError("Failed to search concepts");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ concepts: Concept[] }>(
        `admin/concepts/search?q=${encodeURIComponent(searchTerm)}&limit=20`,
      );
      setSearchResults(data.concepts || []);
    } catch (err) {
      setError("Failed to search concepts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleConcept = (conceptId: string) => {
    setSelectedConcepts((prev) =>
      prev.includes(conceptId)
        ? prev.filter((id) => id !== conceptId)
        : [...prev, conceptId],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiRequest(
        `admin/prerequisite-learning/prerequisites/${prerequisite.id}/link-concepts`,
        {
          method: "POST",
          body: JSON.stringify({ conceptIds: selectedConcepts }),
        },
      );
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const currentConcepts = prerequisite.linkedConcepts;
  const addedConcepts = searchResults.filter(
    (c) =>
      selectedConcepts.includes(c.id) &&
      !currentConcepts.some((cc) => cc.conceptId === c.id),
  );
  const removedConcepts = currentConcepts.filter(
    (c) => !selectedConcepts.includes(c.conceptId),
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Concepts to Prerequisite</DialogTitle>
          <DialogDescription>
            Search and select anatomy concepts to link to preferredLabel:
            string;
            {prerequisite.name} preferredLabel: string;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Concepts */}
          <div>
            <h3 className="text-sm font-medium mb-2">
              Currently Linked ({currentConcepts.length})
            </h3>
            {currentConcepts.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No concepts linked. Search and add concepts below.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex flex-wrap gap-2">
                {currentConcepts.map((concept) => (
                  <Badge
                    key={concept.conceptId}
                    variant={
                      selectedConcepts.includes(concept.conceptId)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleConcept(concept.conceptId)}
                  >
                    {concept.preferredLabel}
                    {!selectedConcepts.includes(concept.conceptId) && (
                      <Trash2 className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div>
            <h3 className="text-sm font-medium mb-2">Search Concepts</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Search by name (e.g., nervus maxillaris)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">
                Search Results ({searchResults.length})
              </h3>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {searchResults.map((concept) => (
                  <div
                    key={concept.id}
                    className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                      selectedConcepts.includes(concept.id) ? "bg-blue-50" : ""
                    }`}
                    onClick={() => toggleConcept(concept.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">
                          {concept.preferredLabel}
                        </div>
                        <div className="text-xs text-gray-500">
                          {concept.conceptType}
                        </div>
                      </div>
                      {selectedConcepts.includes(concept.id) && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Changes Summary */}
          {(addedConcepts.length > 0 || removedConcepts.length > 0) && (
            <div className="border rounded-lg p-3 bg-yellow-50">
              <h3 className="text-sm font-medium mb-2">
                Changes to be applied:
              </h3>
              {addedConcepts.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs font-medium text-green-700">
                    Adding {addedConcepts.length}:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {addedConcepts.map((c) => (
                      <Badge key={c.id} className="bg-green-600 text-xs">
                        <Plus className="h-3 w-3 mr-1" />
                        {c.preferredLabel}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {removedConcepts.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-red-700">
                    Removing {removedConcepts.length}:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {removedConcepts.map((c) => (
                      <Badge key={c.conceptId} className="bg-red-600 text-xs">
                        <Trash2 className="h-3 w-3 mr-1" />
                        {c.preferredLabel}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              (addedConcepts.length === 0 && removedConcepts.length === 0)
            }
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
