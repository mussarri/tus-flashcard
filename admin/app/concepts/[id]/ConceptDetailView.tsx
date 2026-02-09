"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ConceptDetail } from "./page";
import { ReprocessQuestionsDialog } from "./ReprocessQuestionsDialog";

interface ConceptDetailViewProps {
  concept: ConceptDetail;
}

const CONCEPT_TYPE_COLORS: Record<string, string> = {
  NERVE: "bg-purple-100 text-purple-800",
  MUSCLE: "bg-red-100 text-red-800",
  VESSEL: "bg-blue-100 text-blue-800",
  STRUCTURE: "bg-green-100 text-green-800",
  ORGAN: "bg-yellow-100 text-yellow-800",
  BONE: "bg-gray-100 text-gray-800",
  JOINT: "bg-orange-100 text-orange-800",
  LIGAMENT: "bg-pink-100 text-pink-800",
  SPACE: "bg-teal-100 text-teal-800",
  FORAMEN: "bg-cyan-100 text-cyan-800",
  PLEXUS: "bg-indigo-100 text-indigo-800",
  FASCIA: "bg-lime-100 text-lime-800",
};

const ROLE_COLORS: Record<string, string> = {
  PRIMARY: "bg-blue-100 text-blue-800",
  SECONDARY: "bg-gray-100 text-gray-800",
};

const STRENGTH_COLORS: Record<string, string> = {
  WEAK: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  STRONG: "bg-green-100 text-green-700 font-semibold",
};

export default function ConceptDetailView({ concept }: ConceptDetailViewProps) {
  const [activeTab, setActiveTab] = useState<
    "aliases" | "prerequisites" | "questions" | "topics"
  >("aliases");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddAliasModal, setShowAddAliasModal] = useState(false);
  const [showReprocessDialog, setShowReprocessDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [unresolvedHintsCount, setUnresolvedHintsCount] = useState<number>(0);

  // Fetch unresolved hints count on mount
  useEffect(() => {
    const fetchUnresolvedHints = async () => {
      try {
        const response = await fetch(
          `/api/proxy/admin/concepts/${concept.id}/unresolved-hints`,
        );
        if (response.ok) {
          const data = await response.json();
          setUnresolvedHintsCount(data.count || 0);
        }
      } catch (err) {
        console.error("Failed to fetch unresolved hints:", err);
      }
    };

    fetchUnresolvedHints();
  }, [concept.id]);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    preferredLabel: concept.preferredLabel,
    conceptType: concept.conceptType,
    status: concept.status,
  });

  // Alias form state
  const [aliasFormData, setAliasFormData] = useState({
    alias: "",
    language: "TR",
    source: "ADMIN",
  });

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/proxy/admin/concepts/${concept.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      if (!response.ok) throw new Error("Failed to update concept");

      setShowEditModal(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/proxy/admin/concepts/${concept.id}/alias`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aliasFormData),
        },
      );

      if (!response.ok) throw new Error("Failed to add alias");

      setShowAddAliasModal(false);
      setAliasFormData({ alias: "", language: "TR", source: "ADMIN" });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-4 text-sm text-gray-600">
          <Link href="/concepts" className="hover:text-blue-600">
            Concepts
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{concept.preferredLabel}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {concept.preferredLabel}
              </h1>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full ${
                    CONCEPT_TYPE_COLORS[concept.conceptType]
                  }`}
                >
                  {concept.conceptType}
                </span>
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full ${
                    concept.status === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : concept.status === "NEEDS_REVIEW"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {concept?.status?.replace("_", " ")}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-mono bg-gray-50 px-2 py-1 rounded">
                  {concept.normalizedKey}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowReprocessDialog(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 relative"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reprocess
                {unresolvedHintsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unresolvedHintsCount > 9 ? "9+" : unresolvedHintsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Edit
              </button>
              <Link
                href={`/concepts/merge?source=${concept.id}`}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
              >
                Merge
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {concept.aliases?.length}
              </div>
              <div className="text-sm text-gray-600">Aliases</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {concept.prerequisites?.length}
              </div>
              <div className="text-sm text-gray-600">Prerequisites</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {concept.questions?.length}
              </div>
              <div className="text-sm text-gray-600">Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {concept.topics?.length}
              </div>
              <div className="text-sm text-gray-600">Topics</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab("aliases")}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === "aliases"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Aliases ({concept.aliases?.length})
              </button>
              <button
                onClick={() => setActiveTab("prerequisites")}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === "prerequisites"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Prerequisites ({concept.prerequisites?.length})
              </button>
              <button
                onClick={() => setActiveTab("questions")}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === "questions"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Questions ({concept.questions?.length})
              </button>
              <button
                onClick={() => setActiveTab("topics")}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === "topics"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Topics ({concept.topics?.length})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Aliases Tab */}
            {activeTab === "aliases" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Aliases
                  </h3>
                  <button
                    onClick={() => setShowAddAliasModal(true)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    + Add Alias
                  </button>
                </div>
                <div className="space-y-3">
                  {!Array.isArray(concept.aliases) ||
                  concept.aliases.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No aliases defined
                    </p>
                  ) : (
                    concept.aliases.map((alias) => (
                      <div
                        key={alias.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {alias.alias}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                              {alias.language}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                              {alias.source}
                            </span>
                            <span className="text-xs text-gray-500">
                              Used {alias.usageCount} times
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {alias.isActive ? (
                            <span className="text-xs text-green-600 font-medium">
                              Active
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Disabled
                            </span>
                          )}
                          <button className="text-sm text-red-600 hover:text-red-800">
                            Disable
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Prerequisites Tab */}
            {activeTab === "prerequisites" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Prerequisites
                  </h3>
                  <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                    + Link Prerequisite
                  </button>
                </div>
                <div className="space-y-3">
                  {!Array.isArray(concept.prerequisites) ||
                  concept.prerequisites.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No prerequisites linked
                    </p>
                  ) : (
                    concept.prerequisites.map((prereq) => (
                      <div
                        key={prereq.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {prereq.canonicalLabel}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-medium ${
                                ROLE_COLORS[prereq.role]
                              }`}
                            >
                              {prereq.role}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                STRENGTH_COLORS[prereq.edgeStrength]
                              }`}
                            >
                              {prereq.edgeStrength}
                            </span>
                            <span className="text-xs text-gray-500">
                              Topic coverage: {prereq.topicCoverage}%
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="text-sm text-blue-600 hover:text-blue-800">
                            Change Role
                          </button>
                          <button className="text-sm text-orange-600 hover:text-orange-800">
                            Rebind
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Questions Tab */}
            {activeTab === "questions" && (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Questions Testing This Concept
                  </h3>
                  {concept.questions?.length > 0 || (
                    <p className="text-sm text-gray-600 mt-1">
                      Average difficulty:{" "}
                      {(
                        concept.questions.reduce(
                          (sum, q) => sum + q.difficulty,
                          0,
                        ) / concept.questions.length
                      ).toFixed(1)}
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  {!Array.isArray(concept.questions) ||
                  concept.questions.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No questions linked
                    </p>
                  ) : (
                    concept.questions.map((question) => (
                      <div
                        key={question.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm text-gray-900 line-clamp-2">
                              {question.questionText}
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                {question.year}
                              </span>
                              <span className="text-xs text-gray-600">
                                {question.topic.displayName}
                              </span>
                              <span className="text-xs text-gray-600">
                                Difficulty: {question.difficulty}/10
                              </span>
                            </div>
                          </div>
                          <Link
                            href={`/exam-questions/${question.questionId}`}
                            className="ml-4 text-sm text-blue-600 hover:text-blue-800"
                          >
                            View →
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Topics Tab */}
            {activeTab === "topics" && (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Topic Usage
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Where this concept appears across the curriculum
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {!Array.isArray(concept.topics) ||
                  concept.topics.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 col-span-full">
                      No topic usage data
                    </p>
                  ) : (
                    concept.topics.map((topic, idx) => (
                      <div
                        key={idx}
                        className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="font-medium text-gray-900 mb-1">
                          {topic.topicName}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {topic.lesson}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            Frequency:{" "}
                            <span className="font-semibold">
                              {topic.frequency}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Last:{" "}
                            {new Date(topic.lastUsed).toLocaleDateString()}
                          </div>
                        </div>
                        {/* Frequency Bar */}
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{
                              width: `${Math.min(topic.frequency * 10, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Edit Concept</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Preferred Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.preferredLabel}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        preferredLabel: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Concept Type *
                  </label>
                  <select
                    required
                    value={editFormData.conceptType}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        conceptType: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="NERVE">NERVE</option>
                    <option value="MUSCLE">MUSCLE</option>
                    <option value="VESSEL">VESSEL</option>
                    <option value="STRUCTURE">STRUCTURE</option>
                    <option value="ORGAN">ORGAN</option>
                    <option value="BONE">BONE</option>
                    <option value="JOINT">JOINT</option>
                    <option value="LIGAMENT">LIGAMENT</option>
                    <option value="SPACE">SPACE</option>
                    <option value="FORAMEN">FORAMEN</option>
                    <option value="PLEXUS">PLEXUS</option>
                    <option value="FASCIA">FASCIA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Status *
                  </label>
                  <select
                    required
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        status: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="NEEDS_REVIEW">NEEDS REVIEW</option>
                    <option value="DEPRECATED">DEPRECATED</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Alias Modal */}
      {showAddAliasModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Add Alias</h2>
                <button
                  onClick={() => setShowAddAliasModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleAddAlias} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Alias Text *
                  </label>
                  <input
                    type="text"
                    required
                    value={aliasFormData.alias}
                    onChange={(e) =>
                      setAliasFormData({
                        ...aliasFormData,
                        alias: e.target.value,
                      })
                    }
                    placeholder="e.g., Alternative name or abbreviation"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Language *
                  </label>
                  <select
                    required
                    value={aliasFormData.language}
                    onChange={(e) =>
                      setAliasFormData({
                        ...aliasFormData,
                        language: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TR">Turkish (TR)</option>
                    <option value="EN">English (EN)</option>
                    <option value="LA">Latin (LA)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Source *
                  </label>
                  <select
                    required
                    value={aliasFormData.source}
                    onChange={(e) =>
                      setAliasFormData({
                        ...aliasFormData,
                        source: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="AI">AI</option>
                    <option value="USER">User</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddAliasModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Adding..." : "Add Alias"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reprocess Questions Dialog */}
      {showReprocessDialog && (
        <ReprocessQuestionsDialog
          conceptId={concept.id}
          conceptLabel={concept.preferredLabel}
          unresolvedHintsCount={unresolvedHintsCount}
          onClose={() => setShowReprocessDialog(false)}
          onComplete={() => {
            setShowReprocessDialog(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
