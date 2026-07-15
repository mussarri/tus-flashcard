'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Filter, Search, X } from 'lucide-react';
import BatchCard from './BatchCard';

type Batch = {
  id: string;
  topic: string;
  description?: string | null;
  status: string;
  sourceType?: string | null;
  createdAt: string;
  pages?: Array<{ id: string }>;
};

interface BatchesViewProps {
  batches: Batch[];
}

const DEFAULT_PAGE_SIZE = 12;
const PAGE_SIZE_OPTIONS = [6, 12, 24, 48];
const STATUS_OPTIONS = [
  'PENDING',
  'PROCESSING',
  'UPLOADED',
  'CLASSIFIED',
  'REVIEWED',
  'KNOWLEDGE_EXTRACTED',
  'COMPLETED',
  'CANCELLED',
];

const SOURCE_OPTIONS = [
  { value: 'FILE_UPLOAD', label: 'File upload' },
  { value: 'MANUAL_TEXT', label: 'Manual text' },
];

export default function BatchesView({ batches }: BatchesViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchQuery = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || 'all';
  const sourceFilter = searchParams.get('source') || 'all';
  const rawPage = Number(searchParams.get('page') || '1');
  const rawPageSize = Number(searchParams.get('pageSize') || DEFAULT_PAGE_SIZE);
  const pageSize = PAGE_SIZE_OPTIONS.includes(rawPageSize)
    ? rawPageSize
    : DEFAULT_PAGE_SIZE;

  const updateParams = (
    updates: Record<string, string | number | null>,
    options: { resetPage?: boolean } = {},
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    if (options.resetPage) {
      params.delete('page');
    }

    const queryString = params.toString();
    router.replace(queryString ? `/batches?${queryString}` : '/batches', {
      scroll: false,
    });
  };

  const filteredBatches = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return batches.filter((batch) => {
      const matchesSearch =
        !normalizedSearch ||
        [batch.topic, batch.description, batch.id]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedSearch));

      const matchesStatus =
        statusFilter === 'all' || batch.status === statusFilter;
      const matchesSource =
        sourceFilter === 'all' || batch.sourceType === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [batches, searchQuery, sourceFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBatches.length / pageSize));
  const currentPage = Math.min(Math.max(rawPage || 1, 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedBatches = filteredBatches.slice(
    startIndex,
    startIndex + pageSize,
  );
  const hasActiveFilters =
    searchQuery !== '' || statusFilter !== 'all' || sourceFilter !== 'all';

  const resultStart =
    filteredBatches.length === 0 ? 0 : Math.min(startIndex + 1, filteredBatches.length);
  const resultEnd = Math.min(startIndex + pageSize, filteredBatches.length);

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

        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,1fr)_180px_180px_150px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  updateParams({ q: event.target.value }, { resetPage: true })
                }
                placeholder="Search topic, description, or ID"
                className="h-10 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                updateParams({ status: event.target.value }, { resetPage: true })
              }
              className="h-10 rounded-md border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            <select
              value={sourceFilter}
              onChange={(event) =>
                updateParams({ source: event.target.value }, { resetPage: true })
              }
              className="h-10 rounded-md border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All sources</option>
              {SOURCE_OPTIONS.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>

            <select
              value={pageSize}
              onChange={(event) =>
                updateParams(
                  { pageSize: Number(event.target.value) },
                  { resetPage: true },
                )
              }
              className="h-10 rounded-md border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} / page
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() =>
                  updateParams({
                    q: null,
                    status: null,
                    source: null,
                    page: null,
                  })
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
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
        ) : filteredBatches.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-md">
            <p className="mb-4 text-gray-700">No batches match the current filters.</p>
            <button
              type="button"
              onClick={() =>
                updateParams({
                  q: null,
                  status: null,
                  source: null,
                  page: null,
                })
              }
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing {resultStart}-{resultEnd} of {filteredBatches.length}{' '}
                batches
              </p>
              <p>{batches.length} total batches</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedBatches.map((batch) => (
                <BatchCard key={batch.id} batch={batch} />
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => updateParams({ page: currentPage - 1 })}
                disabled={currentPage <= 1}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <div className="text-center text-sm font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </div>

              <button
                type="button"
                onClick={() => updateParams({ page: currentPage + 1 })}
                disabled={currentPage >= totalPages}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
