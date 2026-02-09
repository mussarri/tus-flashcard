"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ConceptType = {
  NERVE: "NERVE";
  MUSCLE: "MUSCLE";
  VESSEL: "VESSEL";
  STRUCTURE: "STRUCTURE";
  ORGAN: "ORGAN";
  BONE: "BONE";
  JOINT: "JOINT";
  LIGAMENT: "LIGAMENT";
  SPACE: "SPACE";
  FORAMEN: "FORAMEN";
};
const ConceptType: ConceptType = {
  NERVE: "NERVE",
  MUSCLE: "MUSCLE",
  VESSEL: "VESSEL",
  STRUCTURE: "STRUCTURE",
  ORGAN: "ORGAN",
  BONE: "BONE",
  JOINT: "JOINT",
  LIGAMENT: "LIGAMENT",
  SPACE: "SPACE",
  FORAMEN: "FORAMEN",
};
export default function NewConceptPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = (useState<{
    preferredLabel: string;
    conceptType: keyof ConceptType;
    description: string;
  }>({
    preferredLabel: "",
    conceptType: ConceptType.NERVE,
    description: "",
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/proxy/admin/concepts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preferredLabel: formData.preferredLabel,
          conceptType: formData.conceptType || undefined,
          description: formData.description || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create concept");
      }

      router.push("/concepts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Yeni Konsept Oluştur</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="preferredLabel"
            className="block text-sm font-medium mb-2"
          >
            Etiket *
          </label>
          <input
            type="text"
            id="preferredLabel"
            required
            value={formData.preferredLabel}
            onChange={(e) =>
              setFormData({ ...formData, preferredLabel: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="conceptType"
            className="block text-sm font-medium mb-2"
          >
            Konsept Tipi
          </label>
          <select
            id="conceptType"
            value={formData.conceptType}
            onChange={(e) =>
              setFormData({
                ...formData,
                conceptType: e.target.value as keyof ConceptType,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={ConceptType.NERVE}>NERVE</option>
            <option value={ConceptType.MUSCLE}>MUSCLE</option>
            <option value={ConceptType.VESSEL}>VESSEL</option>
            <option value={ConceptType.STRUCTURE}>STRUCTURE</option>
            <option value={ConceptType.ORGAN}>ORGAN</option>
            <option value={ConceptType.BONE}>BONE</option>
            <option value={ConceptType.JOINT}>JOINT</option>
            <option value={ConceptType.LIGAMENT}>LIGAMENT</option>
            <option value={ConceptType.SPACE}>SPACE</option>
            <option value={ConceptType.FORAMEN}>FORAMEN</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium mb-2"
          >
            Açıklama
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? "Oluşturuluyor..." : "Oluştur"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            İptal
          </button>
        </div>
      </form>
    </div>
  );
}
