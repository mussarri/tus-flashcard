import { serverFetch } from '../../../lib/api';
import { notFound } from 'next/navigation';
import BatchDetailClient from './BatchDetailClient';

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  try {
    // Fetch batch data
    const batchResponse = await serverFetch<{ success: boolean; batch: any }>(
      `api/approval/batch/${id}/review`
    );

    if (!batchResponse.success || !batchResponse.batch) {
      notFound();
    }

    // Fetch all related data in parallel
    const [approvedContentResponse, knowledgePointsResponse, flashcardsResponse, questionsResponse] = await Promise.all([
      serverFetch<{ success: boolean; approvedBlocks: any[] }>(
        `api/approval/batch/${id}/approved`
      ).then((response) => ({
        success: response.success,
        approvedContent: response.approvedBlocks || [],
      })).catch(() => ({ success: false, approvedContent: [] })),
      serverFetch<{ success: boolean; batchId: string; knowledgePoints: any[] }>(
        `admin/batches/${id}/knowledge-points`
      ).then((response) => ({
        success: response.success,
        knowledgePoints: response.knowledgePoints || [],
      })).catch(() => ({ success: false, knowledgePoints: [] })),
      serverFetch<{ success: boolean; batchId: string; flashcards: any[] }>(
        `admin/batches/${id}/flashcards`
      ).then((response) => ({
        success: response.success,
        flashcards: response.flashcards || [],
      })).catch(() => ({ success: false, flashcards: [] })),
      serverFetch<{ success: boolean; batchId: string; questions: any[] }>(
        `admin/batches/${id}/questions`
      ).then((response) => ({
        success: response.success,
        questions: response.questions || [],
      })).catch(() => ({ success: false, questions: [] })),
    ]);

    return (
      <BatchDetailClient
        batch={batchResponse.batch}
        approvedContent={approvedContentResponse.approvedContent}
        knowledgePoints={knowledgePointsResponse.knowledgePoints}
        flashcards={flashcardsResponse.flashcards}
        questions={questionsResponse.questions}
      />
    );
  } catch (error) {
    console.error('Failed to fetch batch:', error);
    notFound();
  }
}
