"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Edit } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EditPrerequisiteDialogProps {
  prerequisite: {
    id: string;
    name: string;
    canonicalKey: string | null;
  };
  onClose: () => void;
  onComplete: () => void;
}

export function EditPrerequisiteDialog({
  prerequisite,
  onClose,
  onComplete,
}: EditPrerequisiteDialogProps) {
  const [name, setName] = useState(prerequisite.name);
  const [canonicalKey, setCanonicalKey] = useState(
    prerequisite.canonicalKey || "",
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Prerequisite name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/proxy/admin/prerequisites/${prerequisite.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          canonicalKey: canonicalKey.trim() || null,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update prerequisite");
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
          <DialogTitle>Edit Prerequisite</DialogTitle>
          <DialogDescription>
            Update the prerequisite name and metadata
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              Prerequisite Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Kalp Anatomisi"
            />
            <p className="text-xs text-gray-500">
              The display name for this prerequisite
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="canonicalKey">Canonical Key</Label>
            <Input
              id="canonicalKey"
              value={canonicalKey}
              onChange={(e) => setCanonicalKey(e.target.value)}
              placeholder="e.g., anatomy:heart"
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              A unique identifier for this prerequisite (optional)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Update Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe why you're making this change..."
              rows={3}
            />
            <p className="text-xs text-gray-500">
              These notes will be recorded in the audit log
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Edit className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
