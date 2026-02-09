/* eslint-disable @typescript-eslint/no-explicit-any */
import { serverFetch } from "@/lib/api";
import ConceptDetailView from "./ConceptDetailView";

export interface ConceptAlias {
  id: string;
  alias: string;
  language: "TR" | "EN" | "LA";
  source: "AI" | "ADMIN" | "IMPORT";
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface ConceptPrerequisite {
  id: string;
  prerequisiteId: string;
  canonicalLabel: string;
  role: "PRIMARY" | "SECONDARY";
  edgeStrength: "WEAK" | "MEDIUM" | "STRONG";
  topicCoverage: number;
  createdAt: string;
}

export interface ConceptQuestion {
  id: string;
  questionId: string;
  questionText: string;
  year: number;
  topic: any;
  difficulty: number;
  createdAt: string;
}

export interface ConceptTopic {
  topicName: string;
  lesson: string;
  frequency: number;
  lastUsed: string;
}

export interface ConceptDetail {
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
  aliases: ConceptAlias[];
  prerequisites: ConceptPrerequisite[];
  questions: ConceptQuestion[];
  topics: ConceptTopic[];
  createdAt: string;
  updatedAt: string;
}

export default async function ConceptDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let concept: ConceptDetail | null = null;
  let error: Error | null = null;

  try {
    const response = await serverFetch<{
      success: boolean;
      concept: ConceptDetail;
    }>(`/admin/concepts/${(await params).id}`);
    concept = response.concept;
  } catch (e) {
    console.error("Failed to fetch concept:", e);
    error = e instanceof Error ? e : new Error("An error occurred");
  }

  if (error || !concept) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Failed to load concept
            </h2>
            <p className="text-red-600">
              {error?.message || "An error occurred"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <ConceptDetailView concept={concept} />;
}
