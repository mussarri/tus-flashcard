/* eslint-disable react-hooks/error-boundaries */
import { serverFetch } from "@/lib/api";
import TopicsPageClient from "./TopicsPageClient";

interface Lesson {
  id: string;
  name: string;
  displayName: string | null;
  questionCount: number;
  knowledgePointCount: number;
}

interface Topic {
  id: string;
  name: string;
  displayName: string | null;
  lessonId: string;
  questionCount: number;
  knowledgePointCount: number;
}

interface Subtopic {
  id: string;
  name: string;
  displayName: string | null;
  topicId: string;
  questionCount: number;
  knowledgePointCount: number;
}

export default async function TopicsPage() {
  try {
    const response = await serverFetch<{
      success: boolean;
      lessons: Lesson[];
      topics: Topic[];
      subtopics: Subtopic[];
    }>("admin/topics");

    const lessons = response.success ? response.lessons || [] : [];
    const topics = response.success ? response.topics || [] : [];
    const subtopics = response.success ? response.subtopics || [] : [];

    return (
      <TopicsPageClient
        initialLessons={lessons}
        initialTopics={topics}
        initialSubtopics={subtopics}
      />
    );
  } catch (error) {
    console.error("Failed to fetch topics:", error);
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            Failed to load topics. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}
