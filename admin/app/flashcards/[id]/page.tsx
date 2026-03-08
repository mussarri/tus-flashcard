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

const cardTypeLabels: Record<string, string> = {
  STRUCTURE_ID: "Structure ID",
  CONTENTS_OF_SPACE: "Contents of Space",
  FUNCTIONAL_ANATOMY: "Functional Anatomy",
  RELATIONS_BORDERS: "Relations & Borders",
  LESION_ANATOMY: "Lesion Anatomy",
  EMBRYOLOGIC_ORIGIN: "Embryologic Origin",
  CLINICAL_CORRELATION: "Clinical Correlation",
  HIGH_YIELD_DISTINCTION: "High-Yield Distinction",
  EXCEPT_TRAP: "Except Trap",
  TOPOGRAPHIC_MAP: "Topographic Map",
  SPOT: "Spot",
  CLINICAL_TIP: "Clinical Tip",
  COMPARISON: "Comparison",
  TRAP: "Trap",
};

type Tab = "content" | "visual" | "edit" | "audit";

export default function FlashcardDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const initialTab = (searchParams.get("tab") as Tab) || "content";

  const [flashcard, setFlashcard] = useState<Flashcard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [editForm, setEditForm] = useState({
    front: "",
    back: "",
    cardType: "",
    useVisual: false,
    visualRequirement: "",
    visualContext: "",
    highlightRegion: "",
  });
  const [saving, setSaving] = useState(false);

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
      // Initialize edit form with current values
      setEditForm({
        front: response.flashcard.front,
        back: response.flashcard.back,
        cardType: response.flashcard.cardType,
        useVisual: response.flashcard.useVisual,
        visualRequirement: response.flashcard.visualRequirement || "",
        visualContext: response.flashcard.visualContext || "",
        highlightRegion: response.flashcard.highlightRegion || "",
      });
    } catch (error) {
      console.error("Failed to load flashcard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updateFlashcard(id, editForm);
      await loadFlashcard();
      setActiveTab("content");
      alert("Değişiklikler kaydedildi!");
    } catch (error: any) {
      alert(error.message || "Kaydetme başarısız oldu");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (flashcard) {
      setEditForm({
        front: flashcard.front,
        back: flashcard.back,
        cardType: flashcard.cardType,
        useVisual: flashcard.useVisual,
        visualRequirement: flashcard.visualRequirement || "",
        visualContext: flashcard.visualContext || "",
        highlightRegion: flashcard.highlightRegion || "",
      });
    }
    setActiveTab("content");
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
      <div>
        <nav className="flex space-x-4 border-b mb-6">
          <button
            onClick={() => setActiveTab("content")}
            className={`pb-2 ${
              activeTab === "content"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } border-b-2 font-medium`}
          >
            İçerik
          </button>
          <button
            onClick={() => setActiveTab("visual")}
            className={`pb-2 ${
              activeTab === "visual"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } border-b-2 font-medium`}
          >
            Görsel
          </button>
          <button
            onClick={() => setActiveTab("edit")}
            className={`pb-2 ${
              activeTab === "edit"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } border-b-2 font-medium`}
          >
            Düzenle
          </button>
        </nav>
      </div>
      <div />
      {activeTab !== "edit" ? (
        // View Mode
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Görsel Gerekli
              </label>
              <p className="text-gray-900">
                {flashcard.useVisual ? "Evet" : "Hayır"}
              </p>
            </div>
            {flashcard.useVisual && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Görsel Tipi
                </label>
                <p className="text-gray-900">
                  {flashcard.visualRequirement || "-"}
                </p>
              </div>
            )}
          </div>
          {flashcard.useVisual && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Görsel Bağlamı
                </label>
                <p className="text-gray-900">
                  {flashcard.visualContext || "-"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vurgu Bölgesi
                </label>
                <p className="text-gray-900">
                  {flashcard.highlightRegion || "-"}
                </p>
              </div>
            </div>
          )}
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
          {activeTab === "visual" && (
            <VisualTab flashcard={flashcard} onUpdate={loadFlashcard} />
          )}
          {activeTab === "audit" && (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">
                Audit log özelliği yakında eklenecek.
              </p>
            </div>
          )}
        </div>
      ) : (
        // Edit Mode
        <div className="space-y-4">
          <div className="flex justify-end mb-4 gap-2">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={saving}
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              disabled={saving}
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Soru (Front)
            </label>
            <textarea
              value={editForm.front}
              onChange={(e) =>
                setEditForm({ ...editForm, front: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cevap (Back)
            </label>
            <textarea
              value={editForm.back}
              onChange={(e) =>
                setEditForm({ ...editForm, back: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kart Tipi
            </label>
            <select
              value={editForm.cardType}
              onChange={(e) =>
                setEditForm({ ...editForm, cardType: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seçiniz</option>
              {Object.keys(cardTypeLabels).map((type) => (
                <option key={type} value={type}>
                  {cardTypeLabels[type] || type}
                </option>
              ))}
            </select>
          </div>
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Görsel Ayarları
            </h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useVisual"
                  checked={editForm.useVisual}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      useVisual: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="useVisual"
                  className="ml-2 block text-sm font-medium text-gray-700"
                >
                  Görsel Gerekli
                </label>
              </div>
              {editForm.useVisual && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Görsel Tipi
                    </label>
                    <select
                      value={editForm.visualRequirement}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          visualRequirement: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seçiniz</option>
                      <option value="IMAGE_OCCLUSION">IMAGE_OCCLUSION</option>
                      <option value="SCHEMATIC">SCHEMATIC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Görsel Bağlamı
                    </label>
                    <select
                      value={editForm.visualContext}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          visualContext: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.keys(cardTypeLabels).map((type) => (
                        <option key={type} value={type}>
                          {cardTypeLabels[type] || type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vurgu Bölgesi
                    </label>
                    <input
                      type="text"
                      value={editForm.highlightRegion}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          highlightRegion: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Örn: foramen_ovale"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}{" "}
    </div>
  );
}
