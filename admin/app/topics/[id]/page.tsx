/* eslint-disable @typescript-eslint/no-explicit-any */
import { serverFetch } from "@/lib/api";
import SubtopicDetailsView from "./SubtopicDetailsView";
import { FileSearch } from "lucide-react";
import Link from "next/link";

interface SubtopicDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function SubtopicDetailsPage({
  params,
}: SubtopicDetailsPageProps) {
  const { id } = await params;
  const subtopicId = id;

  console.log(subtopicId);

  // Validate parameters
  if (!id) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            Invalid URL parameters. Please navigate from the topics page.
          </p>
        </div>
      </div>
    );
  }

  try {
    const response = await serverFetch<{
      success: boolean;
      subtopic: any;
      topic: any;
      lesson: any;
      knowledgePoints: any[];
      examQuestions: any[];
      flashcards: {
        approved: any[];
        pending: any[];
      };
      generatedQuestions: {
        approved: any[];
        pending: any[];
      };
      prerequisites: any[];
      stats: {
        totalKnowledgePoints: number;
        totalExamQuestions: number;
        totalFlashcards: number;
        totalGeneratedQuestions: number;
        approvedFlashcards: number;
        approvedGeneratedQuestions: number;
      };
    }>(`admin/subtopics/detail/${subtopicId}`);

    if (!response.success) {
      throw new Error("Failed to fetch subtopic details");
    }

    return (
      <div>
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {response.topic}
              </span>
            </div>
            <Link
              href="/dashboard"
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Clear context
            </Link>
          </div>
        </div>
        <SubtopicDetailsView subtopicId={id} data={response} />;
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch subtopic details:", error);
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            Failed to load subtopic details. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}
