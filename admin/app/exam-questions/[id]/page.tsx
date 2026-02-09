/* eslint-disable @typescript-eslint/no-explicit-any */
import { serverFetch } from "../../../lib/api";
import ExamQuestionDetailView from "./ExamQuestionDetailView";

async function getExamQuestion(id: string) {
  const response = await serverFetch<{
    success: boolean;
    examQuestion: any;
  }>(`/admin/exam-questions/${id}`);

  return response.examQuestion;
}

async function getKnowledgePoints(id: string) {
  try {
    const response = await serverFetch<{
      success: boolean;
      knowledgePoints: any[];
    }>(`/admin/exam-questions/${id}/knowledge-points`);

    return response.knowledgePoints;
  } catch (error) {
    return [];
  }
}

export default async function ExamQuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const examQuestion = await getExamQuestion(id);
  const knowledgePoints = await getKnowledgePoints(id);

  return (
    <ExamQuestionDetailView
      initialExamQuestion={examQuestion}
      initialKnowledgePoints={knowledgePoints}
    />
  );
}
