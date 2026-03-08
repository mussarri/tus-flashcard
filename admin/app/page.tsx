import Link from 'next/link';

export default function Home() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            TUS Medical Education Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Editor Panel - Content Ingestion Pipeline
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/upload"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Upload Content
            </h2>
            <p className="text-gray-600">
              Upload images or PDFs to create a new batch for processing
            </p>
          </Link>

          <Link
            href="/batches"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              View Batches
            </h2>
            <p className="text-gray-600">
              Review and approve parsed content blocks
            </p>
          </Link>

          <Link
            href="/topics"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Topic Generation
            </h2>
            <p className="text-gray-600">
              Generate flashcards and questions by topic with provider selection
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
