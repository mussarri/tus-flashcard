/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Image,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { api } from "../../../lib/api";

interface MissingVisualsKPIData {
  total: number;
  byLesson: Record<string, number>;
  byVisualRequirement: {
    IMAGE_OCCLUSION: number;
    SCHEMATIC: number;
  };
  aging: {
    over7Days: number;
    over14Days: number;
  };
}

export default function MissingVisualsKPI() {
  const [data, setData] = useState<MissingVisualsKPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadKPI();
  }, []);

  const loadKPI = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getMissingVisualsKPI();
      setData({
        total: response.total,
        byLesson: response.byLesson,
        byVisualRequirement: response.byVisualRequirement,
        aging: response.aging,
      });
    } catch (err: any) {
      setError(err.message || "KPI yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-800">
          <XCircle className="w-5 h-5" />
          <span className="font-medium">Hata: {error}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Determine severity and color
  const getSeverity = () => {
    if (data.total === 0) return { level: "SUCCESS", color: "green" };
    if (data.total >= 1 && data.total <= 5)
      return { level: "WARNING", color: "yellow" };
    return { level: "DANGER", color: "red" };
  };

  const severity = getSeverity();
  const colorClasses = {
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-900",
      badge: "bg-green-100 text-green-800",
      button: "bg-green-600 hover:bg-green-700 text-white",
    },
    yellow: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-900",
      badge: "bg-yellow-100 text-yellow-800",
      button: "bg-yellow-600 hover:bg-yellow-700 text-white",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-900",
      badge: "bg-red-100 text-red-800",
      button: "bg-red-600 hover:bg-red-700 text-white",
    },
  };

  const colors = colorClasses[severity.color as keyof typeof colorClasses];

  return (
    <div className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-6`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Image className={`w-6 h-6 ${colors.text}`} />
          <h3 className={`text-lg font-semibold ${colors.text}`}>
            🖼️ Eksik Görseller
          </h3>
        </div>
        {data.total > 0 && (
          <span
            className={`px-3 py-1 rounded-full text-sm font-bold ${colors.badge}`}
          >
            {data.total}
          </span>
        )}
      </div>

      {/* Main Value */}
      {data.total === 0 ? (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <CheckCircle className="w-5 h-5" />
            <p className="font-medium">Tüm görseller tamamlandı</p>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className={`text-4xl font-bold ${colors.text} mb-2`}>
            {data.total}
          </div>
          <p className={`text-sm ${colors.text} opacity-80`}>
            Görsel gereken flashcard
          </p>
        </div>
      )}

      {/* Details */}
      {data.total > 0 && (
        <div className="space-y-3 mb-4">
          {/* By Lesson */}
          {Object.keys(data.byLesson).length > 0 && (
            <div>
              <p
                className={`text-xs font-medium ${colors.text} opacity-70 mb-1`}
              >
                Derslere Göre:
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.byLesson).map(([lesson, count]) => (
                  <span
                    key={lesson}
                    className={`px-2 py-1 text-xs rounded ${colors.badge}`}
                  >
                    {lesson}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* By Visual Requirement */}
          <div>
            <p className={`text-xs font-medium ${colors.text} opacity-70 mb-1`}>
              Görsel Tipine Göre:
            </p>
            <div className="flex flex-wrap gap-2">
              <span className={`px-2 py-1 text-xs rounded ${colors.badge}`}>
                IMAGE_OCCLUSION: {data.byVisualRequirement.IMAGE_OCCLUSION}
              </span>
              <span className={`px-2 py-1 text-xs rounded ${colors.badge}`}>
                SCHEMATIC: {data.byVisualRequirement.SCHEMATIC}
              </span>
            </div>
          </div>

          {/* Aging */}
          {(data.aging.over7Days > 0 || data.aging.over14Days > 0) && (
            <div>
              <p
                className={`text-xs font-medium ${colors.text} opacity-70 mb-1`}
              >
                Yaşlanma:
              </p>
              <div className="flex flex-wrap gap-2">
                {data.aging.over7Days > 0 && (
                  <span className={`px-2 py-1 text-xs rounded ${colors.badge}`}>
                    &gt;7 gün: {data.aging.over7Days}
                  </span>
                )}
                {data.aging.over14Days > 0 && (
                  <span className={`px-2 py-1 text-xs rounded ${colors.badge}`}>
                    &gt;14 gün: {data.aging.over14Days}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CTA Button */}
      {data.total > 0 && (
        <Link
          href="/admin/flashcards/visual-required?visualStatus=REQUIRED"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${colors.button}`}
        >
          <span>Görsel Gereken Kartlara Git</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
