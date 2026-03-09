"use client";

import { FormEvent, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { Brain, Save } from "lucide-react";

interface KnowledgePointItem {
  fact: string;
  priority: number;
  examRelevance: number;
  classificationConfidence: number;
}

const TEMPLATE = JSON.stringify(
  {
    knowledgePoints: [
      {
        fact: "string",
        priority: 0,
        examRelevance: 0,
        classificationConfidence: 0,
      },
    ],
  },
  null,
  2,
);

export default function KnowledgePointGeneratorPage() {
  const [lesson, setLesson] = useState("");
  const [jsonInput, setJsonInput] = useState(TEMPLATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<{
    saved: number;
    created: number;
    updated: number;
  } | null>(null);

  const parsedPreview = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonInput) as { knowledgePoints?: unknown };
      const knowledgePoints = Array.isArray(parsed?.knowledgePoints)
        ? (parsed.knowledgePoints as KnowledgePointItem[])
        : [];
      return {
        valid: true,
        count: knowledgePoints.length,
      };
    } catch {
      return {
        valid: false,
        count: 0,
      };
    }
  }, [jsonInput]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaveResult(null);

    if (!lesson.trim()) {
      setError("Lesson alanı boş olamaz.");
      return;
    }

    let knowledgePoints: KnowledgePointItem[] = [];
    try {
      const parsed = JSON.parse(jsonInput) as { knowledgePoints?: unknown };
      if (!Array.isArray(parsed.knowledgePoints)) {
        setError("JSON içinde knowledgePoints array olmalı.");
        return;
      }
      knowledgePoints = parsed.knowledgePoints as KnowledgePointItem[];
    } catch {
      setError("Geçerli bir JSON gir.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.saveKnowledgePointsFromInput({
        lesson: lesson.trim(),
        knowledgePoints,
      });

      setSaveResult({
        saved: response.saved,
        created: response.created,
        updated: response.updated,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Knowledge point kaydedilemedi.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Brain className="w-8 h-8 text-blue-600" />
          Knowledge Point Save
        </h1>
        <p className="text-gray-600 mt-2">
          Lesson ve JSON gir, knowledge pointleri olduğu gibi veritabanına kaydet.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-lg p-6 space-y-4"
      >
        <div className="space-y-2 max-w-md">
          <label htmlFor="lesson" className="text-sm font-semibold text-gray-700">
            Lesson
          </label>
          <input
            id="lesson"
            type="text"
            value={lesson}
            onChange={(event) => setLesson(event.target.value)}
            placeholder="Örn: Fizyoloji"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="knowledgePointsJson"
            className="text-sm font-semibold text-gray-700"
          >
            Knowledge Points JSON
          </label>
          <textarea
            id="knowledgePointsJson"
            value={jsonInput}
            onChange={(event) => setJsonInput(event.target.value)}
            className="w-full min-h-72 border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="text-sm text-gray-600">
          JSON durum: {parsedPreview.valid ? "Geçerli" : "Geçersiz"} | Adet:{" "}
          {parsedPreview.count}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {saveResult && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-md px-3 py-2 text-sm">
            Kaydedildi. saved: {saveResult.saved}, created: {saveResult.created}
            , updated: {saveResult.updated}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Kaydet
            </>
          )}
        </button>
      </form>
    </div>
  );
}
