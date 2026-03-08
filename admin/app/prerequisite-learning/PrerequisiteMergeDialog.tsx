/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { set } from "zod";

interface PrerequisiteDetail {
  id: string;
  name: string;
  canonicalKey?: string;
  conceptCount?: number;
  topicEdgeCount?: number;
}

interface MergePreview {
  selectedPrerequisites: PrerequisiteDetail[];
  sharedConcepts: Array<{
    id: string;
    label: string;
    count: number;
  }>;
  topicEdges: Array<{
    topicName: string;
    lesson: string;
    totalFrequency: number;
    newStrength: string;
    subtopics: string[];
  }>;
  summary: {
    prerequisiteCount: number;
    totalConcepts: number;
    sharedConceptCount: number;
    affectedTopics: number;
    strengthUpgrades: number;
  };
}

interface Props {
  selectedPrerequisiteIds: string[];
  prerequisites: PrerequisiteDetail[];
  onClose: () => void;
  onMergeComplete: () => void;
}

export function PrerequisiteMergeDialog({
  selectedPrerequisiteIds,
  prerequisites,
  onClose,
  onMergeComplete,
}: Props) {
  const [step, setStep] = useState<"preview" | "configure" | "confirm">(
    "preview",
  );
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  // Merge configuration
  const [canonicalMode, setCanonicalMode] = useState<"existing" | "new">(
    "existing",
  );
  const [selectedCanonicalId, setSelectedCanonicalId] = useState<string>("");
  const [newCanonicalName, setNewCanonicalName] = useState<string>("");

  const selectedPrerequisites = prerequisites.filter((p) =>
    selectedPrerequisiteIds.includes(p.id),
  );

  const loadPreview = async () => {
    if (selectedPrerequisiteIds.length < 2) {
      setError("Please select at least two prerequisites to merge.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/proxy/admin/prerequisite-learning/merge/preview",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedPrerequisiteIds,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to load merge preview");
      }

      const data = await response.json();
      setPreview(data);
      setStep("configure");

      // Default to first prerequisite as canonical
      if (selectedPrerequisiteIds.length > 0) {
        setSelectedCanonicalId(selectedPrerequisiteIds[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Load preview when dialog opens
  useState(() => {
    setTimeout(() => {
      loadPreview();
    }, 600);
  });

  const handleMerge = async () => {
    if (canonicalMode === "existing" && !selectedCanonicalId) {
      setError("Please select a canonical prerequisite");
      return;
    }

    if (canonicalMode === "new" && !newCanonicalName.trim()) {
      setError("Please provide a name for the new canonical prerequisite");
      return;
    }

    setMerging(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/proxy/admin/prerequisite-learning/merge",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedPrerequisiteIds,
            canonicalName:
              canonicalMode === "new" ? newCanonicalName : undefined,
            canonicalPrerequisiteId:
              canonicalMode === "existing" ? selectedCanonicalId : undefined,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to merge prerequisites");
      }

      const result = await response.json();

      onMergeComplete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setMerging(false);
    }
  };

  const getStrengthBadge = (strength: string) => {
    if (strength === "STRONG")
      return <Badge className="bg-purple-600">Strong</Badge>;
    if (strength === "MEDIUM")
      return <Badge className="bg-blue-500">Medium</Badge>;
    return <Badge className="bg-gray-400">Weak</Badge>;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Merge Prerequisites</DialogTitle>
          <DialogDescription>
            Combine {selectedPrerequisiteIds.length} prerequisites into a single
            canonical entry
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading preview...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && preview && step === "configure" && (
          <div className="space-y-6">
            {/* Selected Prerequisites */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Selected Prerequisites ({preview.selectedPrerequisites.length})
              </h3>
              <div className="space-y-2">
                {preview.selectedPrerequisites.map((prereq) => (
                  <div
                    key={prereq.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                  >
                    <div>
                      <div className="font-medium">{prereq.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {prereq.conceptCount || 0} concepts •{" "}
                        {prereq.topicEdgeCount || 0} topic edges
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Canonical Prerequisite Selection */}
            <div className="border-t pt-6">
              <Label className="text-base font-semibold mb-4 block">
                Select Canonical Prerequisite
              </Label>

              <RadioGroup
                value={canonicalMode}
                onValueChange={(value: any) => setCanonicalMode(value)}
              >
                <div className="space-y-4">
                  {/* Use existing */}
                  <div className="flex items-start space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="existing" id="existing" />
                    <div className="flex-1">
                      <Label
                        htmlFor="existing"
                        className="font-medium cursor-pointer"
                      >
                        Use existing prerequisite
                      </Label>
                      {canonicalMode === "existing" && (
                        <div className="mt-3 space-y-2">
                          {selectedPrerequisites.map((prereq) => (
                            <div
                              key={prereq.id}
                              onClick={() => setSelectedCanonicalId(prereq.id)}
                              className={`p-3 border rounded cursor-pointer transition-colors ${
                                selectedCanonicalId === prereq.id
                                  ? "border-purple-500 bg-purple-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="font-medium">{prereq.name}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Create new */}
                  <div className="flex items-start space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="new" id="new" />
                    <div className="flex-1">
                      <Label
                        htmlFor="new"
                        className="font-medium cursor-pointer"
                      >
                        Create new canonical name
                      </Label>
                      {canonicalMode === "new" && (
                        <div className="mt-3">
                          <Input
                            placeholder="Enter canonical prerequisite name..."
                            value={newCanonicalName}
                            onChange={(e) =>
                              setNewCanonicalName(e.target.value)
                            }
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Example: &quot;Chorda tympani sinirinin seyri ve
                            fonksiyonu&quot;
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Merge Preview Summary */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold mb-3">Merge Impact</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {preview.summary.totalConcepts}
                  </div>
                  <div className="text-xs text-gray-600">Total Concepts</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {preview.summary.sharedConceptCount}
                  </div>
                  <div className="text-xs text-gray-600">Shared Concepts</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {preview.summary.affectedTopics}
                  </div>
                  <div className="text-xs text-gray-600">Affected Topics</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {preview.summary.strengthUpgrades}
                  </div>
                  <div className="text-xs text-gray-600">Strength Upgrades</div>
                </div>
              </div>
            </div>

            {/* Topic Edges Preview */}
            {preview.topicEdges.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold mb-3">
                  Topic Edges ({preview.topicEdges.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {preview.topicEdges.map((edge, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{edge.topicName}</div>
                        <div className="text-xs text-gray-500">
                          {edge.lesson}
                          {edge.subtopics.length > 0 &&
                            ` • ${edge.subtopics.length} subtopics`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono">
                          freq: {edge.totalFrequency}
                        </span>
                        {getStrengthBadge(edge.newStrength)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between border-t pt-6">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleMerge} disabled={merging}>
                {merging ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Merge
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
