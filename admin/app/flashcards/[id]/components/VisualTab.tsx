/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "../../../../lib/api";
import {
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface Flashcard {
  id: string;
  useVisual: boolean;
  visualRequirement: string | null;
  visualContext: string | null;
  highlightRegion: string | null;
  visualStatus: "NOT_REQUIRED" | "REQUIRED" | "UPLOADED";
  imageAssetId: string | null;
}

interface VisualTabProps {
  flashcard: Flashcard;
  onUpdate: () => void;
}

export default function VisualTab({ flashcard, onUpdate }: VisualTabProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parsedRegions, setParsedRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>(
    flashcard.highlightRegion || "",
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSvg, setIsSvg] = useState(false);
  const [binding, setBinding] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [imageAssets, setImageAssets] = useState<any[]>([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [loadingAssets, setLoadingAssets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (flashcard.imageAssetId) {
      // Fetch image URL from backend
      setPreviewUrl(
        process.env.NEXT_PUBLIC_API_URL +
          `/admin/visual-assets/${flashcard.imageAssetId}`,
      );
    }
  }, [flashcard.imageAssetId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    try {
      // Check if SVG
      const isSvgFile =
        file.type === "image/svg+xml" || file.name.endsWith(".svg");
      setIsSvg(isSvgFile);

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Upload file
      const response = await api.uploadFlashcardVisual(flashcard.id, file);

      // If SVG, set parsed regions
      if (response.parsedRegions && response.parsedRegions.length > 0) {
        setParsedRegions(response.parsedRegions);
        // Auto-select highlightRegion if it exists in parsed regions
        if (
          flashcard.highlightRegion &&
          response.parsedRegions.includes(flashcard.highlightRegion)
        ) {
          setSelectedRegion(flashcard.highlightRegion);
        } else if (response.parsedRegions.length > 0) {
          setSelectedRegion(response.parsedRegions[0]);
        }
      }

      // Reload flashcard to get updated imageAssetId
      await onUpdate();
    } catch (error: any) {
      setUploadError(error.message || "Yükleme başarısız oldu");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleBind = async () => {
    if (!flashcard.imageAssetId) {
      setUploadError("Önce görsel yükleyin");
      return;
    }

    setBinding(true);
    try {
      await api.bindFlashcardVisual(flashcard.id, {
        imageAssetId: flashcard.imageAssetId,
        highlightRegion: selectedRegion || undefined,
      });
      await onUpdate();
      alert("Görsel bağlandı!");
    } catch (error: any) {
      setUploadError(error.message || "Bağlama başarısız oldu");
    } finally {
      setBinding(false);
    }
  };

  const loadImageAssets = async () => {
    setLoadingAssets(true);
    try {
      const response = await api.getImageAssets({
        search: assetSearch || undefined,
        limit: 50,
      });
      setImageAssets(response?.assets || []);
    } catch (error) {
      console.error("Failed to load image assets:", error);
      alert("Görseller yüklenemedi");
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleBindExistingAsset = async (assetId: string) => {
    setBinding(true);
    try {
      await api.bindFlashcardVisual(flashcard.id, { imageAssetId: assetId });
      await onUpdate();
      setShowAssetPicker(false);
      alert("Mevcut görsel başarıyla bağlandı!");
    } catch (error: any) {
      setUploadError(error.message || "Bağlama başarısız oldu");
    } finally {
      setBinding(false);
    }
  };

  useEffect(() => {
    if (showAssetPicker) {
      loadImageAssets();
    }
  }, [showAssetPicker, assetSearch]);

  const handleReplace = () => {
    setPreviewUrl(null);
    setParsedRegions([]);
    setSelectedRegion("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleTestOcclusion = () => {
    if (!isSvg || !selectedRegion || !previewUrl) return;

    // For SVG occlusion test, we'll highlight the region in the preview
    // In a real implementation, you'd manipulate the SVG DOM
    const svgElement = document.querySelector(
      'object[data*="visual-assets"]',
    ) as HTMLObjectElement;
    if (svgElement && svgElement.contentDocument) {
      const element = svgElement.contentDocument.querySelector(
        `#${selectedRegion}`,
      );
      if (element) {
        const originalFill = (element as SVGElement).getAttribute("fill");
        (element as SVGElement).setAttribute("fill", "red");
        (element as SVGElement).setAttribute("opacity", "0.5");
        setTimeout(() => {
          if (originalFill) {
            (element as SVGElement).setAttribute("fill", originalFill);
          } else {
            (element as SVGElement).removeAttribute("fill");
          }
          (element as SVGElement).removeAttribute("opacity");
        }, 2000);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* Requirement Summary */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Görsel Gereksinimleri
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Görsel Tipi
            </label>
            <p className="text-gray-900">
              {flashcard.visualRequirement || "Belirtilmemiş"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Görsel Seç
            </label>
            <p className="text-gray-900">
              {flashcard.imageAssetId
                ? "Mevcut görsel bağlı"
                : "Görsel seçilmedi"}
            </p>
          </div>
        </div>
      </div>

      {/* Add Visual */}
      {
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Görsel Ekle
          </h3>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border-2 border-dashed border-blue-400 rounded-lg p-6 text-center hover:border-blue-600 transition-colors bg-blue-50"
            >
              <Upload className="mx-auto h-10 w-10 text-blue-600 mb-3" />
              <p className="text-blue-900 font-semibold mb-1">
                Yeni Görsel Yükle
              </p>
              <p className="text-sm text-blue-700">SVG, PNG veya JPG</p>
            </button>

            <button
              onClick={() => setShowAssetPicker(true)}
              className="flex-1 border-2 border-dashed border-green-400 rounded-lg p-6 text-center hover:border-green-600 transition-colors bg-green-50"
            >
              <CheckCircle className="mx-auto h-10 w-10 text-green-600 mb-3" />
              <p className="text-green-900 font-semibold mb-1">
                Mevcut Görsel Seç
              </p>
              <p className="text-sm text-green-700">
                Daha önce yüklenen görseller
              </p>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/svg+xml,image/png,image/jpeg,image/jpg"
            onChange={handleFileSelect}
            className="hidden"
          />

          {uploading && (
            <div className="mt-4 text-center">
              <RefreshCw className="animate-spin mx-auto h-6 w-6 text-blue-600" />
              <p className="text-sm text-gray-600 mt-2">Yükleniyor...</p>
            </div>
          )}
        </div>
      }

      {/* Asset Picker */}
      {showAssetPicker && !flashcard.imageAssetId && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Mevcut Görselleri Seç
            </h3>
            <button
              onClick={() => setShowAssetPicker(false)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Geri Dön
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Görsel ara..."
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loadingAssets ? (
            <div className="text-center py-8">
              <RefreshCw className="animate-spin mx-auto h-8 w-8 text-blue-600" />
              <p className="text-sm text-gray-600 mt-2">
                Görseller yükleniyor...
              </p>
            </div>
          ) : imageAssets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Henüz yüklenmiş görsel bulunmuyor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {imageAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="border-2 border-gray-200 rounded-lg p-3 hover:border-blue-500 transition-colors cursor-pointer"
                  onClick={() => handleBindExistingAsset(asset.id)}
                >
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL}/admin/visual-assets/${asset.id}`}
                    alt={asset.fileName}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                  <p className="text-xs text-gray-700 truncate font-medium">
                    {asset.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {asset._count?.flashcards || 0} flashcard
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {previewUrl && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Önizleme</h3>
            <button
              onClick={handleReplace}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Görseli Değiştir
            </button>
          </div>
          <div className="border rounded-lg p-4 bg-gray-50">
            {isSvg ? (
              <div className="max-w-full">
                <object
                  data={previewUrl}
                  type="image/svg+xml"
                  className="max-w-full h-auto"
                  ref={svgRef as any}
                >
                  <img
                    src={previewUrl}
                    alt="SVG Preview"
                    className="max-w-full h-auto rounded"
                  />
                </object>
              </div>
            ) : (
              <img
                src={previewUrl || undefined}
                alt="Preview"
                className="max-w-full h-auto rounded"
              />
            )}
          </div>

          {/* Region Selection (SVG only) */}
          {isSvg && parsedRegions.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vurgu Bölgesi Seç
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Bölge seçin</option>
                {parsedRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              {selectedRegion && (
                <button
                  onClick={handleTestOcclusion}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Tıkanmayı Test Et
                </button>
              )}
            </div>
          )}

          {/* Bind Button */}
          <div className="mt-4">
            <button
              onClick={handleBind}
              disabled={binding}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {binding ? "Bağlanıyor..." : "Bölge Bağlamayı Onayla"}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">{uploadError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
