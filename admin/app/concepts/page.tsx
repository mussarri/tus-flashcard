/* eslint-disable react-hooks/error-boundaries */
import { serverFetch } from "@/lib/api";
import ConceptsView from "./ConceptsView";

export interface Concept {
  id: string;
  preferredLabel: string;
  normalizedKey: string;
  conceptType:
    | "NERVE"
    | "MUSCLE"
    | "VESSEL"
    | "STRUCTURE"
    | "ORGAN"
    | "BONE"
    | "JOINT"
    | "LIGAMENT";
  status: "ACTIVE" | "NEEDS_REVIEW" | "MERGED";
  aliasCount: number;
  prerequisiteCount: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ConceptsResponse {
  concepts: Concept[];
  total: number;
}

export default async function ConceptsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    type?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    limit?: string;
  }>;
}) {
  try {
    const params = await searchParams;
    const page = parseInt(params.page || "1", 10);
    const limit = parseInt(params.limit || "50", 10);
    const offset = (page - 1) * limit;

    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append("search", params.search);
    if (params.type) queryParams.append("type", params.type);
    if (params.status) queryParams.append("status", params.status);
    queryParams.append("sortBy", params.sortBy || "createdAt");
    queryParams.append("sortOrder", params.sortOrder || "desc");
    queryParams.append("limit", limit.toString());
    queryParams.append("offset", offset.toString());

    const response = await serverFetch<ConceptsResponse>(
      `/admin/concepts?${queryParams.toString()}`,
    );

    return (
      <ConceptsView
        concepts={response.concepts}
        total={response.total}
        initialPage={page}
        initialLimit={limit}
        initialSearch={params.search}
        initialType={params.type}
        initialStatus={params.status}
        initialSortBy={params.sortBy}
        initialSortOrder={params.sortOrder as "asc" | "desc"}
      />
    );
  } catch (error) {
    console.error("Failed to fetch concepts:", error);
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Failed to load concepts
            </h2>
            <p className="text-red-600">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
          </div>
        </div>
      </div>
    );
  }
}
