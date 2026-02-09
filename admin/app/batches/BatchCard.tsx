'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface BatchCardProps {
  batch: {
    id: string;
    topic: string;
    description?: string;
    status: string;
    createdAt: string;
    pages?: any[];
  };
}

export default function BatchCard({ batch }: BatchCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      setIsDeleting(true);
      await api.deleteBatch(batch.id);
      router.refresh();
    } catch (error) {
      alert('Failed to delete batch');
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow relative group">
      <Link href={`/batches/${batch.id}`} className="block">
        <h2 className="text-xl font-semibold text-gray-900 mb-2 pr-8">
          {batch.topic}
        </h2>
        {batch.description && (
          <p className="text-sm text-gray-800 mb-4">{batch.description}</p>
        )}
        <div className="flex items-center justify-between text-sm text-gray-700 font-medium">
          <span>{batch.pages?.length || 0} page(s)</span>
          <span
            className={`px-2 py-1 rounded font-semibold ${
              batch.status === 'COMPLETED'
                ? 'bg-green-100 text-green-800'
                : batch.status === 'PROCESSING'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {batch.status}
          </span>
        </div>
        <p className="text-xs text-gray-600 font-medium mt-4">
          {new Date(batch.createdAt).toLocaleDateString()}
        </p>
      </Link>

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className={`absolute top-4 right-4 p-2 rounded-md transition-colors ${
          showConfirm
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 opacity-0 group-hover:opacity-100'
        } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Delete batch"
      >
        {isDeleting ? (
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : showConfirm ? (
          <span className="text-xs font-medium">Confirm?</span>
        ) : (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
