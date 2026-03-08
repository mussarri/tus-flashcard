'use client';

import Link from 'next/link';
import {
  FolderOpen,
  FileText,
  Brain,
  BookOpen,
  ArrowRight,
  AlertCircle,
  Image,
} from 'lucide-react';
import MissingVisualsKPI from '../../components/admin/dashboard/MissingVisualsKPI';

interface WorkQueueCard {
  title: string;
  description: string;
  count: number;
  href: string;
  icon: string;
  color: string;
}

const getIcon = (iconName: string) => {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    FolderOpen,
    FileText,
    Brain,
    BookOpen,
    Image,
  };
  return icons[iconName];
};

interface DashboardViewProps {
  workQueue: WorkQueueCard[];
}

export default function DashboardView({ workQueue }: DashboardViewProps) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Editor Work Queue</h1>
        <p className="text-gray-600 mt-2">
          Review pending work and take action on items requiring attention
        </p>
      </div>

      {/* Missing Visuals KPI */}
      <div className="mb-6">
        <MissingVisualsKPI />
      </div>

      {workQueue.every((item) => item.count === 0) ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-green-900 mb-2">All caught up!</h2>
          <p className="text-green-700">No pending work items at this time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workQueue.map((item) => {
            const Icon = getIcon(item.icon);
            const colorClasses = {
              blue: 'bg-blue-50 border-blue-200 text-blue-900',
              yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
              purple: 'bg-purple-50 border-purple-200 text-purple-900',
              green: 'bg-green-50 border-green-200 text-green-900',
              red: 'bg-red-50 border-red-200 text-red-900',
            };

            return (
              <Link
                key={item.title}
                href={item.href}
                className={`
                  block p-6 rounded-lg border-2 transition-all hover:shadow-lg
                  ${colorClasses[item.color as keyof typeof colorClasses]}
                `}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6" />
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                  </div>
                  {item.count > 0 && (
                    <span className="px-3 py-1 bg-white rounded-full text-sm font-bold">
                      {item.count}
                    </span>
                  )}
                </div>
                <p className="text-sm opacity-80 mb-4">{item.description}</p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>Go to</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
