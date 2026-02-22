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
          <div className="flex items-center gap-3">
            <Link
              href="/batches/new-manual"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium"
            >
              + Manual Text Batch
            </Link>
            <Link
              href="/upload"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Upload Files
            </Link>
          </div>
        </div>

        {batches.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 mb-4">No batches yet</p>
            <div className="flex justify-center gap-4">
              <Link
                href="/batches/new-manual"
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Create manual text batch →
              </Link>
              <span className="text-gray-400">or</span>
              <Link
                href="/upload"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Upload files →
              </Link>
            </div>
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
