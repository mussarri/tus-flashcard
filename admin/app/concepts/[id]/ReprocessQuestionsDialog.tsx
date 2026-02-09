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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
} from "lucide-react";

interface ReprocessQuestionsDialogProps {
  conceptId: string;
  conceptLabel: string;
  unresolvedHintsCount: number;
  onClose: () => void;
  onComplete: () => void;
}

interface ReprocessResult {
  conceptId: string;
  dryRun: boolean;
  matchedHints: string[];
  affectedQuestions: number;
  processedQuestions: number;
  skippedQuestions: number;
  createdQuestionConceptLinks: number;
  upgradedPrerequisites: number;
  unresolvedRemaining: number;
}

export function ReprocessQuestionsDialog({
  conceptId,
  conceptLabel,
  unresolvedHintsCount,
  onClose,
  onComplete,
}: ReprocessQuestionsDialogProps) {
  const [step, setStep] = useState<"initial" | "dryrun" | "processing" | "complete">("initial");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dryRunResult, setDryRunResult] = useState<ReprocessResult | null>(null);
  const [finalResult, setFinalResult] = useState<ReprocessResult | null>(null);

  const handleDryRun = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/proxy/admin/concepts/${conceptId}/reprocess-questions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dryRun: true, maxQuestions: 100 }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to run dry run");
      }

      const data = await response.json();
      setDryRunResult(data);
      setStep("dryrun");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReprocess = async () => {
    setLoading(true);
    setError(null);
    setStep("processing");

    try {
      const response = await fetch(
        `/api/proxy/admin/concepts/${conceptId}/reprocess-questions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dryRun: false, maxQuestions: 100 }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reprocess questions");
      }

      const data = await response.json();
      setFinalResult(data);
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStep("initial");
    } finally {
      setLoading(false);
    }
  };

  const renderInitialStep = () => (
    <>
      <DialogHeader>
        <DialogTitle>Reprocess Questions for Concept</DialogTitle>
        <DialogDescription>
          Re-check previously unresolved questions that may now match{" "}
          <strong>{conceptLabel}</strong>
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {unresolvedHintsCount === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              There are no unresolved concept hints for this concept. Reprocessing
              may not affect any questions.
            </AlertDescription>
          </Alert>
        )}

        {unresolvedHintsCount > 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Found <strong>{unresolvedHintsCount} unresolved hints</strong> that
              may match this concept.
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">What this will do:</h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Re-check previously unresolved questions</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Try to link THIS concept to those questions</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Upgrade weak or label-only prerequisites if possible</span>
            </li>
          </ul>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">What this will NOT do:</h4>
          <ul className="space-y-1 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-gray-400">✗</span>
              <span>Change topic or subtopic</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">✗</span>
              <span>Modify question text or answers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">✗</span>
              <span>Create new concepts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">✗</span>
              <span>Affect already-correct questions</span>
            </li>
          </ul>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            This will reprocess only questions that previously could not match this
            concept. No topics or questions will be changed. This action is safe and
            reversible.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={handleDryRun}
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Info className="mr-2 h-4 w-4" />
          Dry Run (Preview)
        </Button>
        <Button onClick={handleConfirmReprocess} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <RefreshCw className="mr-2 h-4 w-4" />
          Confirm Reprocess
        </Button>
      </DialogFooter>
    </>
  );

  const renderDryRunStep = () => {
    if (!dryRunResult) return null;

    return (
      <>
        <DialogHeader>
          <DialogTitle>Dry Run Results (Preview)</DialogTitle>
          <DialogDescription>
            These changes will be applied if you confirm
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {dryRunResult.affectedQuestions > 20 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This will affect{" "}
                {dryRunResult.affectedQuestions} questions. Please review carefully
                before proceeding.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">
                {dryRunResult.affectedQuestions}
              </div>
              <div className="text-sm text-blue-700">Questions to Process</div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">
                {dryRunResult.createdQuestionConceptLinks}
              </div>
              <div className="text-sm text-green-700">New Concept Links</div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-900">
                {dryRunResult.matchedHints.length}
              </div>
              <div className="text-sm text-purple-700">Matched Hints</div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">
                {dryRunResult.skippedQuestions}
              </div>
              <div className="text-sm text-gray-700">Skipped Questions</div>
            </div>
          </div>

          {dryRunResult.matchedHints.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Matched Hints:</h4>
              <div className="flex flex-wrap gap-2">
                {dryRunResult.matchedHints.slice(0, 10).map((hint, idx) => (
                  <Badge key={idx} variant="secondary">
                    {hint}
                  </Badge>
                ))}
                {dryRunResult.matchedHints.length > 10 && (
                  <Badge variant="outline">
                    +{dryRunResult.matchedHints.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setStep("initial")}>
            Back
          </Button>
          <Button onClick={handleConfirmReprocess} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <RefreshCw className="mr-2 h-4 w-4" />
            Confirm Reprocess
          </Button>
        </DialogFooter>
      </>
    );
  };

  const renderProcessingStep = () => (
    <>
      <DialogHeader>
        <DialogTitle>Processing Questions...</DialogTitle>
        <DialogDescription>
          Please wait while we reprocess questions for this concept
        </DialogDescription>
      </DialogHeader>

      <div className="py-8 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-sm text-gray-600">
          This may take a moment...
        </p>
      </div>
    </>
  );

  const renderCompleteStep = () => {
    if (!finalResult) return null;

    return (
      <>
        <DialogHeader>
          <DialogTitle>Reprocessing Complete!</DialogTitle>
          <DialogDescription>
            Successfully updated questions for {conceptLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              All changes have been applied successfully.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">
                {finalResult.processedQuestions}
              </div>
              <div className="text-sm text-blue-700">Questions Processed</div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">
                {finalResult.createdQuestionConceptLinks}
              </div>
              <div className="text-sm text-green-700">New Concept Links</div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-900">
                {finalResult.upgradedPrerequisites}
              </div>
              <div className="text-sm text-purple-700">Prerequisites Upgraded</div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-900">
                {finalResult.unresolvedRemaining}
              </div>
              <div className="text-sm text-orange-700">Unresolved Remaining</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => {
            onComplete();
            onClose();
          }}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Done
          </Button>
        </DialogFooter>
      </>
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        {step === "initial" && renderInitialStep()}
        {step === "dryrun" && renderDryRunStep()}
        {step === "processing" && renderProcessingStep()}
        {step === "complete" && renderCompleteStep()}
      </DialogContent>
    </Dialog>
  );
}
