/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { X, AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";

interface UnmatchedQuestion {
  id: string;
  year: number;
  examType: string | null;
  questionNumber: number | null;
  question: string;
  lesson: { name: string; id: string } | null;
  unmatchedTopic: string | null;
  unmatchedSubtopic: string | null;
  unmatchedConcepts: string[];
  topicId: string | null;
  subtopicId: string | null;
}

interface Topic {
  id: string;
  name: string;
  displayName: string | null;
}

interface Subtopic {
  id: string;
  name: string;
  displayName: string | null;
}

interface Concept {
  id: string;
  preferredLabel: string;
  normalizedLabel: string;
}

interface OntologyResolutionModalProps {
  question: UnmatchedQuestion;
  onClose: () => void;
  onResolved: () => void;
}

export default function OntologyResolutionModal({
  question,
  onClose,
  onResolved,
}: OntologyResolutionModalProps) {
  const [activeAction, setActiveAction] = useState<
    "approve" | "resolve" | "reject" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState("");

  // Resolution form state
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    question.topicId || "",
  );
  const [selectedSubtopicId, setSelectedSubtopicId] = useState<string>(
    question.subtopicId || "",
  );
  const [selectedConceptIds, setSelectedConceptIds] = useState<string[]>([]);

  // Available options
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (question.lesson?.id) {
      loadTopics();
      loadConcepts();
    }
  }, [question.lesson?.id]);

  useEffect(() => {
    if (selectedTopicId) {
      loadSubtopics(selectedTopicId);
    } else {
      setSubtopics([]);
    }
  }, [selectedTopicId]);

  const loadTopics = async () => {
    if (!question.lesson?.id) return;
    setLoadingData(true);
    try {
      const response = await api.getTopics();
      // Filter topics by lesson
      const lessonTopics = response.topics.filter(
        (t: any) => t.lessonId === question.lesson!.id,
      );
      setTopics(lessonTopics);
    } catch (err) {
      console.error("Failed to load topics:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadSubtopics = async (topicId: string) => {
    try {
      const response = await api.getTopics({ topicId });
      setSubtopics(response.subtopics || []);
    } catch (err) {
      console.error("Failed to load subtopics:", err);
    }
  };

  const loadConcepts = async () => {
    try {
      // Load all concepts (in a real app, you'd want pagination/search)
      const response = await fetch("/api/proxy/admin/concepts?limit=1000");
      const data = await response.json();
      setConcepts(data.concepts || []);
    } catch (err) {
      console.error("Failed to load concepts:", err);
    }
  };

  const handleApproveAsIs = async () => {
    if (!understood) {
      setError("Please confirm you understand the impact");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await api.resolveOntologyMismatches(question.id, {
        action: "APPROVE_AS_IS",
      });
      onResolved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!understood) {
      setError("Please confirm you understand the impact");
      return;
    }

    if (
      !selectedTopicId &&
      !selectedSubtopicId &&
      selectedConceptIds.length === 0
    ) {
      setError("Please select at least one resolution");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await api.resolveOntologyMismatches(question.id, {
        action: "RESOLVE",
        topicId: selectedTopicId || undefined,
        subtopicId: selectedSubtopicId || undefined,
        conceptIds:
          selectedConceptIds.length > 0 ? selectedConceptIds : undefined,
      });
      onResolved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!understood) {
      setError("Please confirm you understand the impact");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await api.resolveOntologyMismatches(question.id, {
        action: "REJECT_SUGGESTIONS",
      });
      onResolved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleConcept = (conceptId: string) => {
    setSelectedConceptIds((prev) =>
      prev.includes(conceptId)
        ? prev.filter((id) => id !== conceptId)
        : [...prev, conceptId],
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              🧠 Resolve Ontology (Needs Review)
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {question.year} {question.examType} #{question.questionNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Important Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-yellow-900 mb-2">
                  ⚠️ Important Rules
                </p>
                <ul className="space-y-1 text-yellow-800">
                  <li>
                    • Resolving ontology{" "}
                    <strong>does NOT create prerequisites</strong>
                  </li>
                  <li>
                    • Resolving ontology{" "}
                    <strong>does NOT modify prerequisite statistics</strong>
                  </li>
                  <li>
                    • Prerequisite statistics are generated{" "}
                    <strong>only when the question is finalized</strong>
                  </li>
                  <li>
                    • Once approved, this question{" "}
                    <strong>will affect analytics and reports</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Question Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Question:</p>
            <p className="text-gray-900">{question.question}</p>
          </div>

          {/* Current AI Suggestions */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">
                🔍 Current AI Suggestions (Read-only)
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Suggested Topic
                </p>
                <p className="text-gray-900 mt-1">
                  {question.unmatchedTopic || "—"}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">
                  Suggested Subtopic
                </p>
                <p className="text-gray-900 mt-1">
                  {question.unmatchedSubtopic || "—"}
                </p>
              </div>

              {question.unmatchedConcepts.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Suggested Concepts
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {question.unmatchedConcepts.map((concept, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-3 italic">
              *(These are suggestions, not final decisions.)*
            </p>
          </div>

          {/* Resolution Options */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ✏️ Resolution Options
            </h3>

            {/* Option 1: Approve as-is */}
            <div
              className={`border-2 rounded-lg p-4 mb-4 cursor-pointer transition-colors ${
                activeAction === "approve"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-green-300"
              }`}
              onClick={() => setActiveAction("approve")}
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    🟢 Option 1 — Approve as-is
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>
                      Recommended if the AI output is already correct.
                    </strong>
                  </p>
                  <div className="bg-white border border-gray-200 rounded p-3 mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Effects:
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>
                        • Question status → <strong>ANALYZED</strong>
                      </li>
                      <li>• Question is included in analytics and reports</li>
                      <li>• Prerequisite statistics will be generated</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Option 2: Resolve */}
            <div
              className={`border-2 rounded-lg p-4 mb-4 cursor-pointer transition-colors ${
                activeAction === "resolve"
                  ? "border-yellow-500 bg-yellow-50"
                  : "border-gray-200 hover:border-yellow-300"
              }`}
              onClick={() => setActiveAction("resolve")}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    🟡 Option 2 — Resolve & Correct
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>
                      Use this if topic, subtopic, or concepts are incorrect or
                      missing.
                    </strong>
                  </p>

                  {activeAction === "resolve" && (
                    <div className="space-y-4 mt-4">
                      {/* Topic Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Topic
                        </label>
                        <select
                          value={selectedTopicId}
                          onChange={(e) => setSelectedTopicId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          disabled={loadingData}
                        >
                          <option value="">— Leave unchanged —</option>
                          {topics.map((topic) => (
                            <option key={topic.id} value={topic.id}>
                              {topic.displayName || topic.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Subtopic Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subtopic (optional)
                        </label>
                        <select
                          value={selectedSubtopicId}
                          onChange={(e) =>
                            setSelectedSubtopicId(e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          disabled={!selectedTopicId || subtopics.length === 0}
                        >
                          <option value="">— Leave unchanged or clear —</option>
                          {subtopics.map((subtopic) => (
                            <option key={subtopic.id} value={subtopic.id}>
                              {subtopic.displayName || subtopic.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Concept Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Concepts
                        </label>
                        <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                          {concepts.length === 0 ? (
                            <p className="text-sm text-gray-500">
                              Loading concepts...
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {concepts.slice(0, 50).map((concept) => (
                                <label
                                  key={concept.id}
                                  className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedConceptIds.includes(
                                      concept.id,
                                    )}
                                    onChange={() => toggleConcept(concept.id)}
                                    className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                                  />
                                  <span className="text-sm text-gray-900">
                                    {concept.preferredLabel}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Existing concept links will be replaced with your
                          selection
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-white border border-gray-200 rounded p-3 mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Effects:
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>
                        • If all mismatches are resolved →{" "}
                        <strong>ANALYZED</strong>
                      </li>
                      <li>
                        • If something remains unresolved →{" "}
                        <strong>NEEDS_REVIEW</strong>
                      </li>
                      <li>
                        • Analytics are affected{" "}
                        <strong>only if finalized</strong>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Option 3: Reject */}
            <div
              className={`border-2 rounded-lg p-4 mb-4 cursor-pointer transition-colors ${
                activeAction === "reject"
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 hover:border-red-300"
              }`}
              onClick={() => setActiveAction("reject")}
            >
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    🔴 Option 3 — Reject Suggestions
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>
                      Use if the question is low quality or not suitable.
                    </strong>
                  </p>
                  <div className="bg-white border border-gray-200 rounded p-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Effects:
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>
                        • Question status → <strong>IGNORED</strong>
                      </li>
                      <li>• Question will NOT affect analytics</li>
                      <li>• Can be revisited later if needed</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Outcome Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3">
              📊 Status Outcome Summary
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-200">
                    <th className="text-left py-2 px-2 font-medium text-blue-900">
                      Action
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-blue-900">
                      Final Status
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-blue-900">
                      Analytics
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-blue-900">
                      Prerequisite Stats
                    </th>
                  </tr>
                </thead>
                <tbody className="text-blue-800">
                  <tr className="border-b border-blue-100">
                    <td className="py-2 px-2">Approve as-is</td>
                    <td className="py-2 px-2">ANALYZED</td>
                    <td className="py-2 px-2">✅ Included</td>
                    <td className="py-2 px-2">✅ Generated</td>
                  </tr>
                  <tr className="border-b border-blue-100">
                    <td className="py-2 px-2">Resolve (complete)</td>
                    <td className="py-2 px-2">ANALYZED</td>
                    <td className="py-2 px-2">✅ Included</td>
                    <td className="py-2 px-2">✅ Generated</td>
                  </tr>
                  <tr className="border-b border-blue-100">
                    <td className="py-2 px-2">Resolve (partial)</td>
                    <td className="py-2 px-2">NEEDS_REVIEW</td>
                    <td className="py-2 px-2">❌ Excluded</td>
                    <td className="py-2 px-2">❌ Not generated</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2">Reject</td>
                    <td className="py-2 px-2">IGNORED</td>
                    <td className="py-2 px-2">❌ Excluded</td>
                    <td className="py-2 px-2">❌ Not generated</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Confirmation */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="understand"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="understand"
                className="text-sm text-gray-700 cursor-pointer"
              >
                <strong>I understand the impact of this action</strong>
                <br />
                <span className="text-xs text-gray-600">
                  Once a question becomes <strong>ANALYZED</strong>, it will
                  immediately affect: topic statistics, prerequisite importance,
                  and exam intelligence reports.
                </span>
              </label>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>

          {activeAction === "approve" && (
            <button
              onClick={handleApproveAsIs}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
              disabled={!understood || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Approve as-is
                </>
              )}
            </button>
          )}

          {activeAction === "resolve" && (
            <button
              onClick={handleResolve}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 flex items-center gap-2"
              disabled={!understood || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Resolving...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Apply Resolution
                </>
              )}
            </button>
          )}

          {activeAction === "reject" && (
            <button
              onClick={handleReject}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2"
              disabled={!understood || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Reject & Ignore
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
