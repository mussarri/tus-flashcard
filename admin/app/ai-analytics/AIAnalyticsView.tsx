'use client';

import Link from 'next/link';
import { BarChart3, TrendingUp, DollarSign, Activity } from 'lucide-react';

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

interface AIAnalyticsViewProps {
  summary: SummaryData;
}

export default function AIAnalyticsView({ summary }: AIAnalyticsViewProps) {
  const formatNumber = (num: number) => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(2)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(2)}K`;
    }
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatTaskType = (taskType: string) => {
    return taskType
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Analytics</h1>
          <p className="mt-2 text-gray-600">
            Monitor token usage and costs across all AI operations
          </p>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/ai-analytics/by-task"
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">By Task</p>
                <p className="text-lg font-semibold text-gray-900">
                  View Details
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/ai-analytics/by-time"
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">By Time</p>
                <p className="text-lg font-semibold text-gray-900">
                  View Details
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/ai-analytics/by-batch"
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">By Batch</p>
                <p className="text-lg font-semibold text-gray-900">
                  View Details
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/ai-analytics/by-topic"
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">By Topic</p>
                <p className="text-lg font-semibold text-gray-900">
                  View Details
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Requests</p>
                <p className="text-3xl font-bold text-gray-900">
                  {summary.total.requests.toLocaleString()}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Tokens</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatNumber(summary.total.totalTokens)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Cost</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(summary.total.totalCostUSD)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Cost/Request</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(summary.total.averageCostUSD)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Token Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Token Breakdown
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Input Tokens</span>
                <span className="font-semibold text-gray-900">
                  {formatNumber(summary.total.inputTokens)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Output Tokens</span>
                <span className="font-semibold text-gray-900">
                  {formatNumber(summary.total.outputTokens)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-gray-900 font-medium">Total Tokens</span>
                <span className="font-bold text-gray-900">
                  {formatNumber(summary.total.totalTokens)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Usage by Task Type
            </h2>
            <div className="space-y-3">
              {summary.byTask.map((task) => (
                <div
                  key={task.taskType}
                  className="flex justify-between items-center"
                >
                  <span className="text-gray-600">
                    {formatTaskType(task.taskType)}
                  </span>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900 block">
                      {task.requests} requests
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatCurrency(task.totalCostUSD)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
