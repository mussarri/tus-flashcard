"use client";

import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { Activity, User, Clock, CheckCircle, XCircle } from "lucide-react";

interface AuditLog {
  id: string;
  adminUserId: string;
  actionType: string;
  actionMode: string | null;
  provider: string | null;
  batchId: string | null;
  topicId: string | null;
  success: boolean;
  resultCount: number | null;
  skippedCount: number | null;
  deletedCount: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");

  useEffect(() => {
    // TODO: Implement API endpoint to fetch audit logs
    setLoading(false);
  }, []);

  const getActionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      KNOWLEDGE_EXTRACTION: "Knowledge Extraction",
      FLASHCARD_GENERATION: "Flashcard Generation",
      QUESTION_GENERATION: "Question Generation",
    };
    return labels[type] || type;
  };

  const filteredLogs =
    filter === "all"
      ? logs
      : logs.filter((log) =>
          filter === "success" ? log.success : !log.success
        );

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-600 mt-2">Audit trail of all admin actions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("success")}
            className={`px-4 py-2 rounded ${
              filter === "success"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Success
          </button>
          <button
            onClick={() => setFilter("failed")}
            className={`px-4 py-2 rounded ${
              filter === "failed"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Failed
          </button>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No logs found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Mode / Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Results
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {getActionTypeLabel(log.actionType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {log.adminUserId.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.actionMode && (
                      <span className="mr-2">{log.actionMode}</span>
                    )}
                    {log.provider && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {log.provider}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.resultCount !== null && (
                      <span className="mr-2">Created: {log.resultCount}</span>
                    )}
                    {log.skippedCount !== null && (
                      <span className="mr-2">Skipped: {log.skippedCount}</span>
                    )}
                    {log.deletedCount !== null && (
                      <span>Skipped: {log.deletedCount}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.success ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Success
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="w-4 h-4" />
                        Failed
                      </span>
                    )}
                    {log.errorMessage && (
                      <div className="text-xs text-red-600 mt-1">
                        {log.errorMessage}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
