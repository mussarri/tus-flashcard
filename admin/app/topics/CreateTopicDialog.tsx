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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface Lesson {
  id: string;
  name: string;
  displayName: string | null;
}

interface CreateTopicDialogProps {
  lessons: Lesson[];
}

export default function CreateTopicDialog({ lessons }: CreateTopicDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lessonId, setLessonId] = useState("");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!lessonId || !name.trim()) {
      setError("Please select a lesson and enter a topic name");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await api.createTopic({
        lessonId,
        name: name.trim(),
        displayName: displayName.trim() || undefined,
      });

      // Reset form and close dialog
      setName("");
      setDisplayName("");
      setLessonId("");
      setOpen(false);

      // Refresh page to show new topic
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create topic");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setName("");
    setDisplayName("");
    setLessonId("");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Topic
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Topic</DialogTitle>
          <DialogDescription>
            Add a new topic to a lesson. Topics are broad subject areas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lesson">Lesson *</Label>
            <Select value={lessonId} onValueChange={setLessonId}>
              <SelectTrigger id="lesson">
                <SelectValue placeholder="Select lesson" />
              </SelectTrigger>
              <SelectContent>
                {lessons.map((lesson) => (
                  <SelectItem key={lesson.id} value={lesson.id}>
                    {lesson.displayName || lesson.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Topic Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Diabetes Mellitus"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Internal system name for the topic
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name (Optional)</Label>
            <Input
              id="display-name"
              placeholder="e.g., Diabetes"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              User-facing name shown in the app
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !lessonId || !name.trim()}
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Topic
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
