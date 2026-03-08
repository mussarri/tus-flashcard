"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";

type Difficulty = "easy" | "medium" | "hard";

interface UserFlashcardResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  flashcards: Array<{
    progressId: string;
    flashcardId: string;
    front: string;
    cardType: string;
    difficulty: Difficulty;
    totalReviews: number;
    correctCount: number;
    incorrectCount: number;
    lastReview: string | null;
    lesson: { id: string; name: string; displayName: string } | null;
    topic: { id: string; name: string; displayName: string } | null;
    subtopic: { id: string; name: string; displayName: string } | null;
  }>;
}

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-red-100 text-red-700",
};

export default function UserFlashcardProgressPage() {
  const [userId, setUserId] = useState("");
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UserFlashcardResponse | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<
    "all" | Difficulty
  >("all");

  const filteredRows = useMemo(() => {
    if (!data) return [];
    if (difficultyFilter === "all") return data.flashcards;
    return data.flashcards.filter((row) => row.difficulty === difficultyFilter);
  }, [data, difficultyFilter]);

  const handleFetch = async () => {
    if (!userId.trim()) {
      setError("Kullanıcı ID gerekli.");
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.getUserFlashcardsWithDifficulty(
        userId.trim(),
        limit,
      );
      setData(response);
    } catch (fetchError) {
      setData(null);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Veriler alınamadı.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Kullanıcı Flashcard Zorlukları
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Kullanıcının kartlarını ve kart bazlı zorluk seviyesini
            (easy/medium/hard) listeler.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Kullanıcı ID
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="uuid"
                className="h-10 px-3 rounded-md border border-gray-300"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Limit
              <input
                value={limit}
                type="number"
                min={1}
                max={500}
                onChange={(e) => setLimit(Number(e.target.value) || 100)}
                className="h-10 px-3 rounded-md border border-gray-300"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Zorluk filtresi
              <select
                value={difficultyFilter}
                onChange={(e) =>
                  setDifficultyFilter(e.target.value as "all" | Difficulty)
                }
                className="h-10 px-3 rounded-md border border-gray-300"
              >
                <option value="all">Tümü</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>

            <button
              onClick={handleFetch}
              disabled={loading}
              className="h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Yükleniyor..." : "Listele"}
            </button>
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {data && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 text-sm text-gray-700">
              <span className="font-semibold">Kullanıcı:</span> {data.user.name || "-"} (
              {data.user.email}) |{" "}
              <span className="font-semibold">Toplam kart:</span>{" "}
              {data.flashcards.length} |{" "}
              <span className="font-semibold">Gösterilen:</span>{" "}
              {filteredRows.length}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3">Flashcard</th>
                    <th className="text-left px-4 py-3">Zorluk</th>
                    <th className="text-left px-4 py-3">Tip</th>
                    <th className="text-left px-4 py-3">Doğru / Yanlış</th>
                    <th className="text-left px-4 py-3">Ders / Konu</th>
                    <th className="text-left px-4 py-3">Son Review</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.progressId} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-900 max-w-lg">
                        <div className="line-clamp-2">{row.front}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {row.flashcardId}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${DIFFICULTY_STYLE[row.difficulty]}`}
                        >
                          {row.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.cardType}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.correctCount} / {row.incorrectCount}{" "}
                        <span className="text-xs text-gray-500">
                          ({row.totalReviews} review)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.lesson?.displayName || row.lesson?.name || "-"} /{" "}
                        {row.topic?.displayName || row.topic?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.lastReview
                          ? new Date(row.lastReview).toLocaleString("tr-TR")
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRows.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                Filtreye uyan kart bulunamadı.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
