import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/api";
import PrerequisiteDetailView from "./PrerequisiteDetailView";
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lesson?: string }>;
}

interface PrerequisiteDetailResponse {
  id: string;
  name: string;
  canonicalKey: string | null;
  createdAt: string;
  updatedAt: string;
  linkedConcepts: Array<{
    conceptId: string;
    preferredLabel: string;
    conceptType: string;
    status: string;
  }>;
  isConceptLess: boolean;
  topicCoverage: Array<{
    topicName: string;
    subtopic: string | null;
    frequency: number;
    strength: string;
  }>;
  totalFrequency: number;
  maxStrength: string;
  examMetrics: {
    examImportance: number;
    totalFrequency: number;
    maxStrength: string;
    rank?: number;
  };
  patternContext: Array<{
    patternType: string;
    count: number;
  }>;
  sourceEvidence?: {
    questions: Array<{
      questionId: string;
      year: number;
      topic: string | null;
      subtopic: string | null;
      patternType: string | null;
    }>;
    total: number;
  };
  mergeCandidates: Array<{
    prerequisiteId: string;
    name: string;
    similarityScore: number;
    reasons: string[];
  }>;
  questions: Array<{
    questionId: string;
    year: number;
    topic: string | null;
    subtopic: string | null;
    patternType: string | null;
  }>;
}

export default async function PrerequisiteDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { lesson = "Anatomi" } = await searchParams;

  let prerequisite: PrerequisiteDetailResponse | null = null;
  let error: string | null = null;

  try {
    prerequisite = await serverFetch<PrerequisiteDetailResponse>(
      `/admin/prerequisite-learning/prerequisites/${id}?lesson=${lesson}&includeEvidence=true&evidenceLimit=20`,
    );
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load prerequisite";
  }

  if (!prerequisite) {
    return notFound();
  } else {
    return (
      <PrerequisiteDetailView
        prerequisite={prerequisite}
        lesson={lesson}
        error={error}
      />
    );
  }
}
