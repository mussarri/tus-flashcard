"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Concept {
  id: string;
  preferredLabel: string;
  normalizedKey: string;
  conceptType: string;
  aliasCount: number;
  prerequisiteCount: number;
  questionCount: number;
}

interface MergePreview {
  aliasesToMigrate: string[];
  prerequisitesToMigrate: number;
  questionsToMigrate: number;
}

export default function ConceptMergePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceId = searchParams.get("source");

  const [sourceConcept, setSourceConcept] = useState<Concept | null>(null);
  const [targetConcept, setTargetConcept] = useState<Concept | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Concept[]>([]);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load source concept
  useEffect(() => {
    if (sourceId) {
      // TODO: Fetch source concept from API
      // For now, mock data
      const fetchSourceConcept = async () => {
        setSourceConcept({
          id: sourceId,
          preferredLabel: "Chorda tympani nerve",
          normalizedKey: "chorda-tympani-nerve",
          conceptType: "NERVE",
          aliasCount: 3,
          prerequisiteCount: 5,
          questionCount: 12,
        });
      };
      fetchSourceConcept();
    }
  }, [sourceId]);

  // Search for target concepts
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Call API to search concepts
      // Mock data for now
      setTimeout(() => {
        setSearchResults([
          {
            id: "2",
            preferredLabel: "Facial nerve (CN VII)",
            normalizedKey: "facial-nerve-cn-vii",
            conceptType: "NERVE",
            aliasCount: 8,
            prerequisiteCount: 15,
            questionCount: 45,
          },
          {
            id: "3",
            preferredLabel: "Nervus facialis",
            normalizedKey: "nervus-facialis",
            conceptType: "NERVE",
            aliasCount: 2,
            prerequisiteCount: 3,
            questionCount: 8,
          },
        ]);
        setIsLoading(false);
      }, 500);
    } catch (err) {
      setError("Failed to search concepts");
      setIsLoading(false);
    }
  };

  // Select target concept and generate preview
  const handleSelectTarget = async (concept: Concept) => {
    setTargetConcept(concept);
    setSearchResults([]);

    // Generate merge preview
    // TODO: Call API to get merge preview
    setPreview({
      aliasesToMigrate: ["Chorda tympani", "CT nerve", "Chorda tympani dalı"],
      prerequisitesToMigrate: 5,
      questionsToMigrate: 12,
    });
  };

  // Execute merge
  const handleMerge = async () => {
    if (!sourceConcept || !targetConcept) return;

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Call API to execute merge
      // Mock success
      setTimeout(() => {
        alert("Merge completed successfully!");
        router.push(`/concepts/${targetConcept.id}`);
      }, 1000);
    } catch (err) {
      setError("Failed to merge concepts");
      setIsLoading(false);
    }
  };

  if (!sourceConcept) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              No source concept selected
            </h2>
            <p className="text-yellow-600 mb-4">
              Please select a concept from the concepts list to merge.
            </p>
            <Link
              href="/concepts"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Concepts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-4 text-sm text-gray-600">
          <Link href="/concepts" className="hover:text-blue-600">
            Concepts
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Merge Concepts</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Merge Concepts
          </h1>
          <p className="text-gray-600">
            Combine duplicate concepts while preserving all relationships
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Caution</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Source concept will be marked as MERGED and become inactive
                  </li>
                  <li>
                    All aliases, prerequisites, and question links will move to
                    target
                  </li>
                  <li>This action is logged in audit trail</li>
                  <li>Cannot be undone automatically</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Source Concept (Left) */}
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-red-900">
                Source Concept
              </h2>
              <span className="text-xs px-2 py-1 bg-red-200 text-red-800 rounded font-medium">
                WILL BE MERGED
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm text-red-700 mb-1">Preferred Label</div>
                <div className="text-xl font-bold text-red-900">
                  {sourceConcept.preferredLabel}
                </div>
              </div>

              <div>
                <div className="text-sm text-red-700 mb-1">Normalized Key</div>
                <div className="font-mono text-sm bg-red-100 px-2 py-1 rounded text-red-900">
                  {sourceConcept.normalizedKey}
                </div>
              </div>

              <div>
                <div className="text-sm text-red-700 mb-1">Type</div>
                <div className="text-red-900">{sourceConcept.conceptType}</div>
              </div>

              <div className="pt-4 border-t border-red-200">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-2xl font-bold text-red-900">
                      {sourceConcept.aliasCount}
                    </div>
                    <div className="text-xs text-red-700">Aliases</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-900">
                      {sourceConcept.prerequisiteCount}
                    </div>
                    <div className="text-xs text-red-700">Prerequisites</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-900">
                      {sourceConcept.questionCount}
                    </div>
                    <div className="text-xs text-red-700">Questions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Target Concept (Right) */}
          <div
            className={`border-2 rounded-lg p-6 ${
              targetConcept
                ? "bg-green-50 border-green-300"
                : "bg-gray-50 border-gray-300 border-dashed"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Target Concept
              </h2>
              {targetConcept && (
                <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded font-medium">
                  WILL SURVIVE
                </span>
              )}
            </div>

            {!targetConcept ? (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Search for the concept to merge into (the one that will
                  survive)
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search by label..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    Search
                  </button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Select Target:
                    </div>
                    {searchResults.map((concept) => (
                      <button
                        key={concept.id}
                        onClick={() => handleSelectTarget(concept)}
                        className="w-full text-left p-3 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors"
                      >
                        <div className="font-medium text-gray-900">
                          {concept.preferredLabel}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {concept.normalizedKey}
                        </div>
                        <div className="flex gap-3 mt-2 text-xs text-gray-600">
                          <span>{concept.aliasCount} aliases</span>
                          <span>{concept.prerequisiteCount} prereqs</span>
                          <span>{concept.questionCount} questions</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-green-700 mb-1">
                    Preferred Label
                  </div>
                  <div className="text-xl font-bold text-green-900">
                    {targetConcept.preferredLabel}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-green-700 mb-1">
                    Normalized Key
                  </div>
                  <div className="font-mono text-sm bg-green-100 px-2 py-1 rounded text-green-900">
                    {targetConcept.normalizedKey}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-green-700 mb-1">Type</div>
                  <div className="text-green-900">
                    {targetConcept.conceptType}
                  </div>
                </div>

                <div className="pt-4 border-t border-green-200">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-900">
                        {targetConcept.aliasCount}
                      </div>
                      <div className="text-xs text-green-700">Aliases</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-900">
                        {targetConcept.prerequisiteCount}
                      </div>
                      <div className="text-xs text-green-700">
                        Prerequisites
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-900">
                        {targetConcept.questionCount}
                      </div>
                      <div className="text-xs text-green-700">Questions</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setTargetConcept(null);
                    setPreview(null);
                  }}
                  className="w-full mt-4 text-sm text-gray-600 hover:text-gray-900"
                >
                  Change target →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Merge Preview */}
        {preview && targetConcept && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              Merge Preview
            </h3>

            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-blue-800 mb-2">
                  Aliases to migrate ({preview.aliasesToMigrate.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {preview.aliasesToMigrate.map((alias, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-blue-800">
                    Prerequisites to migrate
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {preview.prerequisitesToMigrate}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-blue-800">
                    Questions to migrate
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {preview.questionsToMigrate}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-blue-200">
                <div className="text-sm font-medium text-blue-800 mb-2">
                  After merge:
                </div>
                <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                  <li>
                    Target will have{" "}
                    {targetConcept.aliasCount + preview.aliasesToMigrate.length}{" "}
                    total aliases
                  </li>
                  <li>
                    Target will have{" "}
                    {targetConcept.prerequisiteCount +
                      preview.prerequisitesToMigrate}{" "}
                    total prerequisites
                  </li>
                  <li>
                    Target will have{" "}
                    {targetConcept.questionCount + preview.questionsToMigrate}{" "}
                    total questions
                  </li>
                  <li>Source concept will be marked as MERGED</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <Link href="/concepts" className="text-gray-600 hover:text-gray-900">
            ← Cancel
          </Link>

          <button
            onClick={handleMerge}
            disabled={!preview || isLoading}
            className="bg-orange-600 text-white px-6 py-3 rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? "Merging..." : "Execute Merge"}
          </button>
        </div>
      </div>
    </div>
  );
}
