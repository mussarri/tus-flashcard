"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Concept } from "./page";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ConceptRulesDialog } from "./DecisionDialog";

interface ConceptsViewProps {
  concepts: Concept[];
  total: number;
  initialPage?: number;
  initialLimit?: number;
  initialSearch?: string;
  initialType?: string;
  initialStatus?: string;
  initialSortBy?: string;
  initialSortOrder?: "asc" | "desc";
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

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  NEEDS_REVIEW: "bg-yellow-100 text-yellow-800",
  MERGED: "bg-gray-100 text-gray-600",
};

export default function ConceptsView({
  concepts: initialConcepts,
  total: initialTotal,
  initialPage = 1,
  initialLimit = 50,
  initialSearch = "",
  initialType = "ALL",
  initialStatus = "ACTIVE",
  initialSortBy = "preferredLabel",
  initialSortOrder = "asc",
}: ConceptsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [concepts, setConcepts] = useState(initialConcepts);
  const [total, setTotal] = useState(initialTotal);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState<string>(initialType);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [sortBy, setSortBy] = useState<string>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialSortOrder);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialLimit);
  const [loading, setLoading] = useState(false);

  // Update URL with current filters
  const updateURL = (params: Record<string, string | number>) => {
    const newParams = new URLSearchParams();

    if (params.search) newParams.set("search", params.search.toString());
    if (params.type !== "ALL") newParams.set("type", params.type.toString());
    if (params.status !== "ALL")
      newParams.set("status", params.status.toString());
    newParams.set("sortBy", params.sortBy?.toString() || "preferredLabel");
    newParams.set("sortOrder", params.sortOrder?.toString() || "asc");
    newParams.set("page", params.page?.toString() || "1");
    newParams.set("limit", params.limit?.toString() || "50");

    router.push(`/concepts?${newParams.toString()}`, { scroll: false });
  };

  // Fetch concepts from API
  const fetchConcepts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (typeFilter !== "ALL") params.append("type", typeFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
      params.append("limit", itemsPerPage.toString());
      params.append("offset", ((currentPage - 1) * itemsPerPage).toString());

      const response = await fetch(
        `/api/proxy/admin/concepts?${params.toString()}`,
      );
      const data = await response.json();

      setConcepts(data.concepts);
      setTotal(data.total);

      // Update URL
      updateURL({
        search: searchQuery,
        type: typeFilter,
        status: statusFilter,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: itemsPerPage,
      });
    } catch (error) {
      console.error("Failed to fetch concepts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when filters or page change
  useEffect(() => {
    fetchConcepts();
  }, [currentPage, itemsPerPage, typeFilter, statusFilter, sortBy, sortOrder]);

  // Reset to page 1 when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchConcepts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const totalPages = Math.ceil(total / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, total);

  return (
    <div className="p-8 ">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 ">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Concept Explorer
              </h1>
              <p className="text-gray-600 mt-2">
                Ontology Control Center — {total} total concepts
              </p>
            </div>
            <div className="flex gap-2">
              <ConceptRulesDialog />
              <Link
                href="/concepts/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                + New Concept
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search by label..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Concept Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">All Types</option>
                  <option value="NERVE">Nerve</option>
                  <option value="MUSCLE">Muscle</option>
                  <option value="VESSEL">Vessel</option>
                  <option value="STRUCTURE">Structure</option>
                  <option value="ORGAN">Organ</option>
                  <option value="BONE">Bone</option>
                  <option value="JOINT">Joint</option>
                  <option value="LIGAMENT">Ligament</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="NEEDS_REVIEW">Needs Review</option>
                  <option value="MERGED">Merged</option>
                </select>
              </div>
            </div>

            {/* Sorting Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="createdAt">Created Date</option>
                  <option value="updatedAt">Updated Date</option>
                  <option value="preferredLabel">Name (A-Z)</option>
                  <option value="conceptType">Type</option>
                  <option value="status">Status</option>
                  <option value="prerequisiteCount">Prerequisite Count</option>
                  <option value="questionCount">Question Count</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(e.target.value as "asc" | "desc")
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Concepts Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preferred Label
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aliases
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prerequisites
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : concepts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No concepts found matching your filters
                    </td>
                  </tr>
                ) : (
                  concepts.map((concept) => (
                    <tr
                      key={concept.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/concepts/${concept.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {concept.preferredLabel}
                        </Link>
                        <div className="text-xs text-gray-500 mt-1">
                          {concept.normalizedKey}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            CONCEPT_TYPE_COLORS[concept.conceptType] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {concept.conceptType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">
                          {concept.aliasCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">
                          {concept.prerequisiteCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">
                          {concept.questionCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            STATUS_COLORS[concept.status] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {concept.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/concepts/${concept.id}`}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          View
                        </Link>
                        <Link
                          href={`/concepts/${concept.id}/edit`}
                          className="text-gray-600 hover:text-gray-900 mr-4"
                        >
                          Edit
                        </Link>
                        <button
                          className="text-yellow-600 hover:text-yellow-900"
                          onClick={() =>
                            alert("Flag functionality coming soon")
                          }
                        >
                          Flag
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {total === 0 ? 0 : startItem} to {endItem} of {total}{" "}
            concepts
          </div>

          <div className="flex items-center gap-4">
            {/* Items per page */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || loading}
                className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
