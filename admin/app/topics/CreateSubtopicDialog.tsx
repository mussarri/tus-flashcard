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

interface Topic {
  id: string;
  name: string;
  displayName: string | null;
  lessonId: string;
}

interface CreateSubtopicDialogProps {
  lessons: Lesson[];
  topics: Topic[];
}

export default function CreateSubtopicDialog({
  lessons,
  topics,
}: CreateSubtopicDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lessonId, setLessonId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lessonTopics = topics.filter((t) => t.lessonId === lessonId);

  const handleCreate = async () => {
    if (!topicId || !name.trim()) {
      setError("Please select a topic and enter a subtopic name");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await api.createSubtopic({
        topicId,
        name: name.trim(),
        displayName: displayName.trim() || undefined,
      });

      // Reset form and close dialog
      setName("");
      setDisplayName("");
      setLessonId("");
      setTopicId("");
      setOpen(false);

      // Refresh page to show new subtopic
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create subtopic"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setName("");
    setDisplayName("");
    setLessonId("");
    setTopicId("");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Create Subtopic
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Subtopic</DialogTitle>
          <DialogDescription>
            Add a new subtopic under a topic. Subtopics are more specific
            subject areas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lesson">Lesson *</Label>
            <Select
              value={lessonId}
              onValueChange={(value) => {
                setLessonId(value);
                setTopicId(""); // Reset topic when lesson changes
              }}
            >
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

          {lessonId && (
            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Select value={topicId} onValueChange={setTopicId}>
                <SelectTrigger id="topic">
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {lessonTopics.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No topics in this lesson
                    </div>
                  ) : (
                    lessonTopics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.displayName || topic.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Subtopic Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Type 1 Diabetes"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Internal system name for the subtopic
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name (Optional)</Label>
            <Input
              id="display-name"
              placeholder="e.g., Type 1 DM"
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
            disabled={isCreating || !topicId || !name.trim()}
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Subtopic
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
