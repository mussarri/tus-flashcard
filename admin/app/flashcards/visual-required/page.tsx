/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { Eye, Upload, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  cardType: string;
  lesson: string | null;
  useVisual: boolean;
  visualRequirement: string | null;
  visualContext: string | null;
  highlightRegion: string | null;
  visualStatus: "NOT_REQUIRED" | "REQUIRED" | "UPLOADED";
  imageAssetId: string | null;
  knowledgePoint: {
    id: string;
    fact: string;
  };
}

export default function VisualRequiredPage() {
  const router = useRouter();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [filters, setFilters] = useState({
    visualStatus: "REQUIRED" as "REQUIRED" | "UPLOADED" | "",
    visualRequirement: "" as "IMAGE_OCCLUSION" | "SCHEMATIC" | "",
    visualContext: "" as string | "",
  });

  useEffect(() => {
    loadFlashcards();
  }, [filters, currentPage, pageSize]);

  const loadFlashcards = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.append("useVisual", "true");
      if (filters.visualStatus) {
        queryParams.append("visualStatus", filters.visualStatus);
      }
      if (filters.visualRequirement) {
        queryParams.append("visualRequirement", filters.visualRequirement);
      }
      if (filters.visualContext) {
        queryParams.append("visualContext", filters.visualContext);
      }
      queryParams.append("page", currentPage.toString());
      queryParams.append("pageSize", pageSize.toString());

    const res = await api.getFlashcardsWithVisual(queryParams.toString());
      const response = res.flashcards;
      setFlashcards(response.flashcards || []);
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages);
        setTotalCount(response.pagination.total);
      }
    } catch (error) {
      console.error("Failed to load flashcards:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      REQUIRED: { color: "bg-red-100 text-red-800", label: "Görsel Gerekli" },
      UPLOADED: { color: "bg-green-100 text-green-800", label: "Yüklendi" },
      NOT_REQUIRED: { color: "bg-gray-100 text-gray-800", label: "Gerekmiyor" },
    };

    const c = config[status] || {
      color: "bg-gray-100 text-gray-800",
      label: status,
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${c.color}`}>
        {c.label}
      </span>
    );
  };

  const getCardTypeBadge = (type: string) => {
    const config: Record<string, { color: string }> = {
      FORAMEN_CONTENT: { color: "bg-blue-100 text-blue-800" },
      SUPERLATIVE: { color: "bg-purple-100 text-purple-800" },
      LOCALIZATION_DEFICIT: { color: "bg-orange-100 text-orange-800" },
      CLINICAL_LANDMARK: { color: "bg-teal-100 text-teal-800" },
      EXCEPTION_DOUBLE_INNERVATION: { color: "bg-pink-100 text-pink-800" },
      BASIC_SPOT: { color: "bg-gray-100 text-gray-800" },
    };

    const c = config[type] || { color: "bg-gray-100 text-gray-800" };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${c.color}`}>
        {type}
      </span>
    );
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Görsel Gereken Flashcardlar
        </h1>
        <p className="text-gray-600">
          Görsel yüklenmesi gereken flashcardları görüntüleyin ve yönetin.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Görsel Durumu
            </label>
            <select
              value={filters.visualStatus}
              onChange={(e) =>
                setFilters({ ...filters, visualStatus: e.target.value as any })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tümü</option>
              <option value="REQUIRED">Gerekli</option>
              <option value="UPLOADED">Yüklendi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Görsel Tipi
            </label>
            <select
              value={filters.visualRequirement}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  visualRequirement: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tümü</option>
              <option value="IMAGE_OCCLUSION">Image Occlusion</option>
              <option value="SCHEMATIC">Schematic</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bağlam
            </label>
            <select
              value={filters.visualContext}
              onChange={(e) =>
                setFilters({ ...filters, visualContext: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tümü</option>
              <option value="SKULL_BASE">Skull Base</option>
              <option value="ORBIT">Orbit</option>
              <option value="FOOT">Foot</option>
              <option value="AXILLA">Axilla</option>
              <option value="PELVIS">Pelvis</option>
              <option value="BRACHIAL_PLEXUS">Brachial Plexus</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Flashcard List */}
      <div className="space-y-4">
        {flashcards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">
              Görsel gereken flashcard bulunamadı.
            </p>
          </div>
        ) : (
          flashcards.map((flashcard) => (
            <div
              key={flashcard.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getCardTypeBadge(flashcard.cardType)}
                  {getStatusBadge(flashcard.visualStatus)}
                </div>
                <Link
                  href={`/admin/flashcards/${flashcard.id}?tab=visual`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Görsel Yükle
                </Link>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Soru:</h3>
                <p className="text-gray-700">{flashcard.front}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">
                    Görsel Tipi:
                  </span>
                  <span className="ml-2 text-gray-600">
                    {flashcard.visualRequirement || "Belirtilmemiş"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Bağlam:</span>
                  <span className="ml-2 text-gray-600">

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Items per page:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              First
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 border rounded text-sm ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Last
            </button>
          </div>

          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}
                    {flashcard.visualContext || "Belirtilmemiş"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Vurgu Bölgesi:
                  </span>
                  <span className="ml-2 text-gray-600">
                    {flashcard.highlightRegion || "Belirtilmemiş"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
