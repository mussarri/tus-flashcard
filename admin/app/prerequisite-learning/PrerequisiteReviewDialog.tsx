/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Link, Edit, Merge, XCircle } from "lucide-react";

interface PrerequisiteReviewDialogProps {
  prerequisite: {
    id: string;
    name: string;
    status: string;
    reviewReason?: string | null;
    concepts?: Array<{ id: string; preferredLabel: string }>;
    edges: Array<{
      topic: { name: string };
      frequency: number;
      strength: string;
    }>;
  };
  onClose: () => void;
  onActionComplete: () => void;
}

export function PrerequisiteReviewDialog({
  prerequisite,
  onClose,
  onActionComplete,
}: PrerequisiteReviewDialogProps) {
  const [recommendation, setRecommendation] = useState<{
    decision: string;
    reason: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const getRecommendation = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/proxy/admin/prerequisite-learning/prerequisites/${prerequisite.id}/review-recommendation`
      );
      if (!response.ok) throw new Error("Failed to get recommendation");
      const data = await response.json();
      setRecommendation(data.recommendation);
    } catch (error) {
      console.error("Failed to get recommendation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    setProcessing(true);
    try {
      // Route to appropriate handler based on action
      switch (action) {
        case "LINK":
          // Navigate to concept linking page
          window.location.href = `/prerequisites/${prerequisite.id}`;
          break;
        case "RENAME":
          // Navigate to rename page
          window.location.href = `/prerequisites/${prerequisite.id}?action=rename`;
          break;
        case "MERGE":
          // Navigate to merge page
          window.location.href = `/prerequisites/${prerequisite.id}?action=merge`;
          break;
        case "IGNORE":
          // Deprecate the prerequisite
          await fetch(
            `/api/proxy/admin/prerequisite-learning/prerequisites/${prerequisite.id}/deprecate`,
            { method: "POST" }
          );
          alert("Prerequisite deprecated successfully");
          onActionComplete();
          break;
      }
    } catch (error) {
      alert(`Action failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setProcessing(false);
    }
  };

  const getActionIcon = (decision: string) => {
    switch (decision) {
      case "LINK":
        return <Link className="h-5 w-5" />;
      case "RENAME":
        return <Edit className="h-5 w-5" />;
      case "MERGE":
        return <Merge className="h-5 w-5" />;
      case "IGNORE":
        return <XCircle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getActionColor = (decision: string) => {
    switch (decision) {
      case "LINK":
        return "bg-blue-600";
      case "RENAME":
        return "bg-purple-600";
      case "MERGE":
        return "bg-orange-600";
      case "IGNORE":
        return "bg-red-600";
      default:
        return "bg-gray-600";
    }
  };

  const totalFrequency = prerequisite.edges.reduce(
    (sum, edge) => sum + edge.frequency,
    0
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Prerequisite</DialogTitle>
          <DialogDescription>
            Help the system determine the correct action for this prerequisite
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prerequisite Info */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">{prerequisite.name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Appears in {totalFrequency} questions across {prerequisite.edges.length} topics
                </p>
              </div>
              <Badge className="bg-yellow-600">Needs Review</Badge>
            </div>

            {prerequisite.reviewReason && (
              <Alert className="mb-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">Review Reason:</span>{" "}
                  {prerequisite.reviewReason}
                </AlertDescription>
              </Alert>
            )}

            {/* Linked Concepts */}
            {prerequisite.concepts && prerequisite.concepts.length > 0 ? (
              <div className="mb-3">
                <p className="text-sm font-medium mb-2">Linked Concepts:</p>
                <div className="flex flex-wrap gap-2">
                  {prerequisite.concepts.map((concept) => (
                    <Badge key={concept.id} variant="outline">
                      {concept.preferredLabel}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-3 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                ⚠️ No concepts linked
              </div>
            )}

            {/* Top Topics */}
            <div>
              <p className="text-sm font-medium mb-2">Top Topics:</p>
              <div className="space-y-1">
                {prerequisite.edges.slice(0, 3).map((edge, idx) => (
                  <div
                    key={idx}
                    className="text-sm flex items-center justify-between"
                  >
                    <span>{edge.topic.name}</span>
                    <Badge variant="outline" className="text-xs">
                      ×{edge.frequency}
                    </Badge>
                  </div>
                ))}
                {prerequisite.edges.length > 3 && (
                  <p className="text-xs text-gray-500">
                    +{prerequisite.edges.length - 3} more topics
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* AI Recommendation */}
          {!recommendation ? (
            <Button
              onClick={getRecommendation}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Analyzing..." : "Get AI Recommendation"}
            </Button>
          ) : (
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold">AI Recommendation</h4>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={getActionColor(recommendation.decision)}>
                  {getActionIcon(recommendation.decision)}
                  <span className="ml-2">{recommendation.decision}</span>
                </Badge>
                <p className="text-sm text-gray-700">{recommendation.reason}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {recommendation && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleAction("LINK")}
                disabled={processing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Link className="h-4 w-4" />
                Link to Concepts
              </Button>
              <Button
                onClick={() => handleAction("RENAME")}
                disabled={processing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Rename
              </Button>
              <Button
                onClick={() => handleAction("MERGE")}
                disabled={processing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Merge className="h-4 w-4" />
                Merge
              </Button>
              <Button
                onClick={() => handleAction("IGNORE")}
                disabled={processing}
                variant="outline"
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <XCircle className="h-4 w-4" />
                Deprecate
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
