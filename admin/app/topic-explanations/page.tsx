"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

type Status = "DRAFT" | "APPROVED" | "REJECTED";
type Explanation = {
  id: string;
  title: string;
  content: string;
  status: Status;
  originFlashcardId: string | null;
  createdAt: string;
  lesson?: { name: string; displayName: string | null } | null;
  topic?: { name: string; displayName: string | null } | null;
  knowledgePoint?: { fact: string } | null;
  _count: { flashcards: number };
};

export default function TopicExplanationsPage() {
  const [status, setStatus] = useState<Status | "ALL">("DRAFT");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Explanation[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Explanation | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (status !== "ALL") query.set("status", status);
      const result = await apiRequest<{ items: Explanation[]; total: number }>(
        `admin/topic-explanations?${query}`,
      );
      setItems(result.items);
      setTotal(result.total);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Anlatımlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { void load(); }, [load]);

  const choose = (item: Explanation) => {
    setSelected(item);
    setTitle(item.title);
    setContent(item.content);
    setError("");
  };

  const save = async (nextStatus?: Status) => {
    if (!selected || !title.trim() || !content.trim()) {
      setError("Başlık ve anlatım boş olamaz.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiRequest(`admin/topic-explanations/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title, content, ...(nextStatus ? { status: nextStatus } : {}) }),
      });
      setSelected(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Konu anlatımları</h1>
        <p className="text-gray-600">AI taslaklarını düzenleyip onaylayın. Onaylanan anlatımlar aynı KP’ye ait kartlarda kullanılabilir.</p>
      </div>
      <div className="flex gap-3 items-center">
        <select value={status} onChange={(event) => { setStatus(event.target.value as Status | "ALL"); setPage(1); setSelected(null); }} className="rounded border p-2">
          <option value="DRAFT">Taslaklar</option><option value="APPROVED">Onaylı</option><option value="REJECTED">Reddedilen</option><option value="ALL">Tümü</option>
        </select>
        <span className="text-sm text-gray-500">{total} kayıt</span>
      </div>
      {error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {loading ? <p>Yükleniyor…</p> : items.length === 0 ? <p>Kayıt bulunamadı.</p> : items.map((item) => (
            <button key={item.id} type="button" onClick={() => choose(item)} className={`block w-full rounded-lg border p-4 text-left hover:border-teal-600 ${selected?.id === item.id ? "border-teal-600 bg-teal-50" : "bg-white"}`}>
              <div className="flex justify-between gap-3"><strong>{item.title}</strong><span className="text-xs">{item.status}</span></div>
              <p className="mt-1 text-sm text-gray-500">{item.lesson?.displayName || item.lesson?.name || "Ders yok"} / {item.topic?.displayName || item.topic?.name || "Konu yok"} · {item._count.flashcards} kart</p>
              <p className="mt-2 line-clamp-2 text-sm text-gray-700">{item.content}</p>
            </button>
          ))}
          <div className="flex items-center gap-3">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Önceki</button>
            <span>{page} / {Math.max(1, Math.ceil(total / 20))}</span>
            <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Sonraki</button>
          </div>
        </div>
        {selected && <div className="h-fit space-y-4 rounded-lg border bg-white p-5">
          <div><label className="mb-1 block text-sm font-medium">Başlık</label><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} className="w-full rounded border p-2" /></div>
          <div><label className="mb-1 block text-sm font-medium">Konu anlatımı</label><textarea value={content} onChange={(event) => setContent(event.target.value)} rows={16} className="w-full rounded border p-2" /></div>
          {selected.knowledgePoint && <p className="rounded bg-gray-50 p-3 text-sm"><strong>Kaynak KP:</strong> {selected.knowledgePoint.fact}</p>}
          {selected.originFlashcardId && <p className="text-xs text-gray-500">Kaynak flashcard: {selected.originFlashcardId}</p>}
          <div className="flex flex-wrap gap-2">
            <button disabled={saving} onClick={() => void save()} className="rounded bg-gray-800 px-4 py-2 text-white disabled:opacity-40">Kaydet</button>
            <button disabled={saving} onClick={() => void save("APPROVED")} className="rounded bg-teal-700 px-4 py-2 text-white disabled:opacity-40">Kaydet ve onayla</button>
            <button disabled={saving} onClick={() => void save("REJECTED")} className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-40">Reddet</button>
          </div>
        </div>}
      </div>
    </div>
  );
}
