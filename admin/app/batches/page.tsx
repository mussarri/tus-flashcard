/* eslint-disable @typescript-eslint/no-explicit-any */
import { serverFetch } from '@/lib/api';
import BatchesView from './BatchesView';

export const dynamic = 'force-dynamic';

export default async function BatchesPage() {
  try {
    const response = await serverFetch<{ success: boolean; batches: any[] }>(
      'api/upload/batches'
    );

    const batches = response.batches || [];

    return <BatchesView batches={batches} />;
  } catch (error) {
    console.error('Failed to fetch batches:', error);
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load batches. Please try again later.</p>
        </div>
      </div>
    );
  }
}
