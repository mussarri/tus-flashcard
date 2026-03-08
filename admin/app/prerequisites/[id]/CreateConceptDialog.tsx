"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateConceptDialogProps {
  prerequisite: {
    id: string;
    name: string;
  };
  onClose: () => void;
  onComplete: () => void;
}

export function CreateConceptDialog({
  prerequisite,
  onClose,
  onComplete,
}: CreateConceptDialogProps) {
  const [preferredLabel, setPreferredLabel] = useState(prerequisite.name);
  const [conceptType, setConceptType] = useState<string>("");
  const [definition, setDefinition] = useState("");
  const [aliases, setAliases] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!preferredLabel.trim()) {
      setError("Concept label is required");
      return;
    }

    if (!conceptType) {
      setError("Concept type is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiRequest("admin/concepts", {
        method: "POST",
        body: JSON.stringify({
          preferredLabel: preferredLabel.trim(),
          conceptType,
          definition: definition.trim() || undefined,
          aliases: aliases
            .split(",")
            .map((a) => a.trim())
            .filter((a) => a.length > 0),
          prerequisiteId: prerequisite.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create concept");
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Concept</DialogTitle>
          <DialogDescription>
            Create a new concept in the ontology and link it to this
            prerequisite
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="preferredLabel">
              Preferred Label <span className="text-red-500">*</span>
            </Label>
            <Input
              id="preferredLabel"
              value={preferredLabel}
              onChange={(e) => setPreferredLabel(e.target.value)}
              placeholder="e.g., Kalp Anatomisi"
            />
            <p className="text-xs text-gray-500">
              The primary name for this concept
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conceptType">
              Concept Type <span className="text-red-500">*</span>
            </Label>
            <Select value={conceptType} onValueChange={setConceptType}>
              <SelectTrigger>
                <SelectValue placeholder="Select concept type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STRUCTURE">Structure (Anatomy)</SelectItem>
                <SelectItem value="FUNCTION">Function (Physiology)</SelectItem>
                <SelectItem value="PATHOLOGY">
                  Pathology (Disease/Disorder)
                </SelectItem>
                <SelectItem value="CLINICAL">
                  Clinical (Symptom/Sign/Procedure)
                </SelectItem>
                <SelectItem value="PHARMACOLOGY">
                  Pharmacology (Drug/Treatment)
                </SelectItem>
                <SelectItem value="MECHANISM">
                  Mechanism (Process/Pathway)
                </SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="definition">Definition</Label>
            <Textarea
              id="definition"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="A brief medical definition of this concept"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aliases">Aliases (comma-separated)</Label>
            <Input
              id="aliases"
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="e.g., Kalp Yapısı, Cardiac Anatomy, Heart Structure"
            />
            <p className="text-xs text-gray-500">
              Alternative names or translations for this concept
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Plus className="mr-2 h-4 w-4" />
            Create Concept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
