/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "../../../lib/api";
import {
  ArrowLeft,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import VisualTab from "./components/VisualTab";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  cardType: string;
  lesson: string | null;
  difficulty: string;
  approvalStatus: string;
  useVisual: boolean;
  visualRequirement: string | null;
  visualContext: string | null;
  highlightRegion: string | null;
  visualStatus: "NOT_REQUIRED" | "REQUIRED" | "UPLOADED";
  imageAssetId: string | null;
  knowledgePoint: {
    id: string;
    fact: string;
    category: string | null;
    subcategory: string | null;
  };
}

type Tab = "content" | "visual" | "audit";

export default function FlashcardDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const initialTab = (searchParams.get("tab") as Tab) || "content";

  const [flashcard, setFlashcard] = useState<Flashcard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  useEffect(() => {
    loadFlashcard();
  }, [id]);

  useEffect(() => {
    const tab = searchParams.get("tab") as Tab;
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const loadFlashcard = async () => {
    try {
      setLoading(true);
      const response = await api.getFlashcardDetail(id);
      setFlashcard(response.flashcard);
    } catch (error) {
      console.error("Failed to load flashcard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      await api.publishFlashcard(id);
      await loadFlashcard();
      alert("Flashcard yayınlandı!");
    } catch (error: any) {
      alert(error.message || "Yayınlama başarısız oldu");
    }
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

  if (!flashcard) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Flashcard bulunamadı.</p>
        </div>
      </div>
    );
  }

  const canPublish =
    flashcard.approvalStatus !== "APPROVED" &&
    (!flashcard.useVisual || flashcard.visualStatus === "UPLOADED");

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/flashcards"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Flashcard Detayı</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("content")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "content"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            İçerik
          </button>
          <button
            onClick={() => setActiveTab("visual")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "visual"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Görsel
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "audit"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Audit Log
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "content" && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Soru (Front)
              </label>
              <p className="text-gray-900">{flashcard.front}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cevap (Back)
              </label>
              <p className="text-gray-900">{flashcard.back}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kart Tipi
                </label>
                <p className="text-gray-900">{flashcard.cardType}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zorluk
                </label>
                <p className="text-gray-900">{flashcard.difficulty}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Onay Durumu
              </label>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  flashcard.approvalStatus === "APPROVED"
                    ? "bg-green-100 text-green-800"
                    : flashcard.approvalStatus === "PENDING"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {flashcard.approvalStatus}
              </span>
            </div>
            <div className="pt-4 border-t">
              <button
                onClick={handlePublish}
                disabled={!canPublish}
                className={`px-4 py-2 rounded-md font-medium ${
                  canPublish
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                title={
                  !canPublish &&
                  flashcard.useVisual &&
                  flashcard.visualStatus !== "UPLOADED"
                    ? "Bu flashcard görsel gerektiriyor. Lütfen görsel yükleyin."
                    : ""
                }
              >
                Yayınla
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "visual" && (
        <VisualTab flashcard={flashcard} onUpdate={loadFlashcard} />
      )}

      {activeTab === "audit" && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Audit log özelliği yakında eklenecek.</p>
        </div>
      )}
    </div>
  );
}
