import { serverFetch } from '@/lib/serverFetch';
import BatchesView from './BatchesView';

export const dynamic = 'force-dynamic';

type Batch = {
  id: string;
  topic: string;
  description?: string | null;
  status: string;
  sourceType?: string | null;
  createdAt: string;
  lessonIds?: string[];
  topicIds?: string[];
  pages?: Array<{ id: string }>;
};

type OntologyOption = { id: string; name: string; displayName?: string | null; lessonId?: string | null };

async function loadBatches(lessonId?: string) {
  try {
    const query = lessonId ? `?lessonId=${encodeURIComponent(lessonId)}` : '';
    const response = await serverFetch<{ success: boolean; batches: Batch[] }>(
      `api/upload/batches${query}`
    );

    return { batches: response.batches || [], error: false };
  } catch (error) {
    console.error('Failed to fetch batches:', error);
    return { batches: [], error: true };
  }
}

async function loadOntology() {
  try {
    const response = await serverFetch<{
      lessons: OntologyOption[];
      topics: OntologyOption[];
    }>('admin/topics');
    return { lessons: response.lessons || [], topics: response.topics || [] };
  } catch (error) {
    console.error('Failed to fetch lesson and topic filters:', error);
    return { lessons: [], topics: [] };
  }
}

export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { lesson } = await searchParams;
  const lessonId = lesson && lesson !== 'all' ? lesson : undefined;
  const [{ batches, error }, { lessons, topics }] = await Promise.all([
    loadBatches(lessonId),
    loadOntology(),
  ]);

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load batches. Please try again later.</p>
        </div>
      </div>
    );
  }

  return <BatchesView batches={batches} lessons={lessons} topics={topics} serverLessonFilter={lessonId} />;
}
