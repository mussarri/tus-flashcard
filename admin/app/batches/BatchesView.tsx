'use client';

import Link from 'next/link';
import BatchCard from './BatchCard';

interface BatchesViewProps {
  batches: any[];
}

export default function BatchesView({ batches }: BatchesViewProps) {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload Batches</h1>
          <Link
            href="/upload"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            New Batch
          </Link>
        </div>

        {batches.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 mb-4">No batches yet</p>
            <Link
              href="/upload"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first batch →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map((batch: any) => (
              <BatchCard key={batch.id} batch={batch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
