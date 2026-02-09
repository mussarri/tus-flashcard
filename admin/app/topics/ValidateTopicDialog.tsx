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
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

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

interface ValidateTopicDialogProps {
  lessons: Lesson[];
  topics: Topic[];
}

interface ValidationResult {
  decision: "TOPIC" | "SUBTOPIC" | "REJECT";
  reason: string;
  confidence: number;
  suggestion?: string;
}

export default function ValidateTopicDialog({
  lessons,
  topics,
}: ValidateTopicDialogProps) {
  const [open, setOpen] = useState(false);
  const [lessonId, setLessonId] = useState("");
  const [proposedName, setProposedName] = useState("");
  const [parentTopicId, setParentTopicId] = useState<string | undefined>();
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lessonTopics = topics.filter((t) => t.lessonId === lessonId);

  const handleValidate = async () => {
    if (!lessonId || !proposedName.trim()) {
      setError("Please select a lesson and enter a proposed name");
      return;
    }

    setIsValidating(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.validateTopicOrSubtopic({
        lessonId,
        proposedName: proposedName.trim(),
        parentTopicId: parentTopicId || undefined,
      });

      setResult(response);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to validate"
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setLessonId("");
    setProposedName("");
    setParentTopicId(undefined);
    setResult(null);
    setError(null);
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case "TOPIC":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "SUBTOPIC":
        return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
      case "REJECT":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case "TOPIC":
        return "bg-green-50 border-green-200";
      case "SUBTOPIC":
        return "bg-blue-50 border-blue-200";
      case "REJECT":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <AlertCircle className="mr-2 h-4 w-4" />
          Validate Topic/Subtopic
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Validate Topic or Subtopic Name</DialogTitle>
          <DialogDescription>
            Use AI to determine if a proposed name should be a TOPIC, SUBTOPIC,
            or should be REJECTED.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lesson">Lesson</Label>
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
            <Label htmlFor="proposed-name">Proposed Name</Label>
            <Input
              id="proposed-name"
              placeholder="Enter the proposed topic or subtopic name"
              value={proposedName}
              onChange={(e) => setProposedName(e.target.value)}
            />
          </div>

          {lessonId && lessonTopics.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="parent-topic">
                Parent Topic (Optional - for subtopic validation)
              </Label>
              <Select
                value={parentTopicId || "none"}
                onValueChange={(v) =>
                  setParentTopicId(v === "none" ? undefined : v)
                }
              >
                <SelectTrigger id="parent-topic">
                  <SelectValue placeholder="Select parent topic or none" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (validate as topic)</SelectItem>
                  {lessonTopics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.displayName || topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert className={getDecisionColor(result.decision)}>
              <div className="flex items-start gap-3">
                {getDecisionIcon(result.decision)}
                <div className="flex-1">
                  <div className="font-semibold mb-1">
                    Decision: {result.decision}
                  </div>
                  <div className="text-sm mb-2">{result.reason}</div>
                  {result.suggestion && (
                    <div className="text-sm">
                      <strong>Suggestion:</strong> {result.suggestion}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
                    Confidence: {(result.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button
            onClick={handleValidate}
            disabled={isValidating || !lessonId || !proposedName.trim()}
          >
            {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Validate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
