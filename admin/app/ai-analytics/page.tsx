import { serverFetch } from '@/lib/api';
import AIAnalyticsView from './AIAnalyticsView';

export const dynamic = 'force-dynamic';

interface SummaryData {
  total: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCostUSD: number;
    averageCostUSD: number;
  };
  byTask: Array<{
    taskType: string;
    requests: number;
    totalTokens: number;
    totalCostUSD: number;
  }>;
}

export default async function AIAnalyticsPage() {
  try {
    const response = await serverFetch<{ success: boolean; data: SummaryData }>(
      'admin/ai-usage/summary'
    );

    if (!response.success || !response.data) {
      return (
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-600">No analytics data available</p>
            </div>
          </div>
        </div>
      );
    }

    return <AIAnalyticsView summary={response.data} />;
  } catch (error) {
    console.error('Failed to fetch AI analytics:', error);
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            Failed to load analytics. Please try again later.
          </div>
        </div>
      </div>
    );
  }
}
