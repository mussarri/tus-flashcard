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
  pages?: Array<{ id: string }>;
};

async function loadBatches() {
  try {
    const response = await serverFetch<{ success: boolean; batches: Batch[] }>(
      'api/upload/batches'
    );

    return { batches: response.batches || [], error: false };
  } catch (error) {
    console.error('Failed to fetch batches:', error);
    return { batches: [], error: true };
  }
}

export default async function BatchesPage() {
  const { batches, error } = await loadBatches();

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load batches. Please try again later.</p>
        </div>
      </div>
    );
  }

  return <BatchesView batches={batches} />;
}
