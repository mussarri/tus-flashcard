"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

type Difficulty = "easy" | "medium" | "hard";

interface UserFlashcardResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  difficulty: "all" | Difficulty;
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
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UserFlashcardResponse | null>(null);
  const [lessons, setLessons] = useState<
    Array<{ id: string; name: string; displayName: string }>
  >([]);
  const [topics, setTopics] = useState<
    Array<{ id: string; name: string; displayName: string; lessonId: string }>
  >([]);
  const [lessonFilter, setLessonFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | Difficulty>(
    "all",
  );

  useEffect(() => {
    void (async () => {
      try {
        const response = await api.getTopics();
        setLessons(response.lessons || []);
        setTopics(response.topics || []);
      } catch (loadError) {
        console.error("Failed to load lesson/topic filters", loadError);
      }
    })();
  }, []);

  const availableTopics =
    lessonFilter === "all"
      ? topics
      : topics.filter((topic) => topic.lessonId === lessonFilter);

  const handleFetch = async (nextPage = page) => {
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
        {
          page: nextPage,
          pageSize: 50,
          lessonId: lessonFilter !== "all" ? lessonFilter : undefined,
          topicId: topicFilter !== "all" ? topicFilter : undefined,
          difficulty: difficultyFilter,
        },
      );
      setData(response);
      setPage(response.page);
    } catch (fetchError) {
      setData(null);
      setError(
        fetchError instanceof Error ? fetchError.message : "Veriler alınamadı.",
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedLessonLabel =
    lessonFilter === "all"
      ? "Tüm dersler"
      : lessons.find((lesson) => lesson.id === lessonFilter)?.displayName ||
        lessons.find((lesson) => lesson.id === lessonFilter)?.name ||
        lessonFilter;

  const selectedTopicLabel =
    topicFilter === "all"
      ? "Tüm konular"
      : topics.find((topic) => topic.id === topicFilter)?.displayName ||
        topics.find((topic) => topic.id === topicFilter)?.name ||
        topicFilter;

  const selectedDifficultyLabel =
    difficultyFilter === "all" ? "Tümü" : difficultyFilter;

  const pageStart =
    data && data.totalCount > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const pageEnd =
    data && data.totalCount > 0
      ? Math.min(data.page * data.pageSize, data.totalCount)
      : 0;

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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
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
              Ders
              <select
                value={lessonFilter}
                onChange={(e) => {
                  const nextLesson = e.target.value;
                  setLessonFilter(nextLesson);
                  setTopicFilter("all");
                  setPage(1);
                }}
                className="h-10 px-3 rounded-md border border-gray-300"
              >
                <option value="all">Tüm dersler</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.displayName || lesson.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Konu
              <select
                value={topicFilter}
                onChange={(e) => {
                  setTopicFilter(e.target.value);
                  setPage(1);
                }}
                disabled={availableTopics.length === 0}
                className="h-10 px-3 rounded-md border border-gray-300 disabled:bg-gray-100"
              >
                <option value="all">Tüm konular</option>
                {availableTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.displayName || topic.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Zorluk filtresi
              <select
                value={difficultyFilter}
                onChange={(e) => {
                  setDifficultyFilter(e.target.value as "all" | Difficulty);
                  setPage(1);
                }}
                className="h-10 px-3 rounded-md border border-gray-300"
              >
                <option value="all">Tümü</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>

            <button
              onClick={() => void handleFetch()}
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
              <span className="font-semibold">Kullanıcı:</span>{" "}
              {data.user.name || "-"} ({data.user.email}) |{" "}
              <span className="font-semibold">Filtre:</span>{" "}
              {selectedLessonLabel} / {selectedTopicLabel} /{" "}
              {selectedDifficultyLabel}
              {" | "}
              <span className="font-semibold">Toplam kart:</span>{" "}
              {data.totalCount} | <span className="font-semibold">Sayfa:</span>{" "}
              {data.page} / {data.totalPages} |{" "}
              <span className="font-semibold">Gösterilen:</span> {pageStart}-
              {pageEnd}
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
                  {data.flashcards.map((row) => (
                    <tr
                      key={row.progressId}
                      className="border-t border-gray-100"
                    >
                      <td className="px-4 py-3 text-gray-900 max-w-lg">
                        <div className="line-clamp-2">{row.front}</div>
                        <Link
                          href={`/flashcards/${row.flashcardId}`}
                          className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                        >
                          {row.flashcardId}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${DIFFICULTY_STYLE[row.difficulty]}`}
                        >
                          {row.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.cardType}
                      </td>
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

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                {pageStart > 0
                  ? `${pageStart}-${pageEnd} / ${data.totalCount}`
                  : "Kayıt yok"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void handleFetch(page - 1)}
                  disabled={loading || page <= 1}
                  className="h-9 px-3 rounded-md border border-gray-300 bg-white text-sm text-gray-700 disabled:opacity-50"
                >
                  Önceki
                </button>
                <button
                  onClick={() => void handleFetch(page + 1)}
                  disabled={loading || !data || page >= data.totalPages}
                  className="h-9 px-3 rounded-md border border-gray-300 bg-white text-sm text-gray-700 disabled:opacity-50"
                >
                  Sonraki
                </button>
              </div>
            </div>

            {data.flashcards.length === 0 && (
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
