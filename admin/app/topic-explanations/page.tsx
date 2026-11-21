"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { apiRequest, getVisualAssetUrl } from "../../lib/api";

type Status = "DRAFT" | "APPROVED" | "REJECTED";
type CatalogItem = { id: string; name: string; displayName: string | null; lessonId?: string | null };
type Explanation = {
  id: string;
  title: string;
  content: string;
  status: Status;
  originFlashcardId: string | null;
  imageAssetId: string | null;
  createdAt: string;
  lesson?: { name: string; displayName: string | null } | null;
  topic?: { name: string; displayName: string | null } | null;
  knowledgePoint?: { fact: string } | null;
  _count: { flashcards: number };
};
const PAGE_SIZES = [10, 20, 50];
const label = (item: CatalogItem) => item.displayName || item.name;

export default function TopicExplanationsPage() {
  const [status, setStatus] = useState<Status | "ALL">("DRAFT");
  const [lessonId, setLessonId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [items, setItems] = useState<Explanation[]>([]);
  const [total, setTotal] = useState(0);
  const [lessons, setLessons] = useState<CatalogItem[]>([]);
  const [topics, setTopics] = useState<CatalogItem[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [selected, setSelected] = useState<Explanation | null>(null);
  const [creating, setCreating] = useState(false);
  const [createLessonId, setCreateLessonId] = useState("");
  const [createTopicId, setCreateTopicId] = useState("");
  const [createStatus, setCreateStatus] = useState<"DRAFT" | "APPROVED">("DRAFT");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const filteredTopics = useMemo(() => topics.filter((topic) => !lessonId || topic.lessonId === lessonId), [topics, lessonId]);
  const createTopics = useMemo(() => topics.filter((topic) => topic.lessonId === createLessonId), [topics, createLessonId]);
  const draftIds = items.filter((item) => item.status === "DRAFT").map((item) => item.id);
  const checkedDraftIds = checked.filter((id) => draftIds.includes(id));
  const allChecked = draftIds.length > 0 && draftIds.every((id) => checked.includes(id));
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (status !== "ALL") query.set("status", status);
      if (lessonId) query.set("lessonId", lessonId);
      if (topicId) query.set("topicId", topicId);
      if (search) query.set("search", search);
      const result = await apiRequest<{ items: Explanation[]; total: number }>(`admin/topic-explanations?${query}`);
      setItems(result.items);
      setTotal(result.total);
      setChecked([]);
      if (page > 1 && result.items.length === 0 && result.total > 0) setPage(Math.ceil(result.total / pageSize));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Anlatımlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, lessonId, topicId, search]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!image) { setImagePreview(""); return; }
    const url = URL.createObjectURL(image);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  useEffect(() => {
    void apiRequest<{ lessons: CatalogItem[]; topics: CatalogItem[] }>("admin/topic-explanations/catalog")
      .then((result) => { setLessons(result.lessons); setTopics(result.topics); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Dersler yüklenemedi."));
  }, []);

  const choose = (item: Explanation) => {
    setCreating(false);
    setImage(null);
    setSelected(item);
    setTitle(item.title);
    setContent(item.content);
    setError("");
    setNotice("");
  };

  const startCreate = () => {
    setSelected(null);
    setCreating(true);
    setTitle("");
    setContent("");
    setImage(null);
    setCreateLessonId("");
    setCreateTopicId("");
    setCreateStatus("DRAFT");
    setError("");
    setNotice("");
  };

  const save = async (nextStatus?: Status) => {
    if (!title.trim() || !content.trim() || (creating && (!createLessonId || !createTopicId))) {
      setError("Başlık, anlatım, ders ve konu alanlarını doldurun.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (creating) {
        const form = new FormData();
        form.set("title", title);
        form.set("content", content);
        form.set("lessonId", createLessonId);
        form.set("topicId", createTopicId);
        form.set("status", createStatus);
        if (image) form.set("image", image);
        await apiRequest("admin/topic-explanations", { method: "POST", body: form });
        setCreating(false);
        setImage(null);
        setNotice("Konu anlatımı oluşturuldu.");
      } else if (selected) {
        await apiRequest(`admin/topic-explanations/${selected.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title, content, ...(nextStatus ? { status: nextStatus } : {}) }),
        });
        setSelected(null);
        setNotice("Konu anlatımı kaydedildi.");
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const approveSelected = async () => {
    if (checkedDraftIds.length === 0) return;
    setSaving(true);
    setError("");
    try {
      const result = await apiRequest<{ approved: number }>("admin/topic-explanations/bulk-approve", {
        method: "POST", body: JSON.stringify({ ids: checkedDraftIds }),
      });
      setSelected(null);
      setNotice(`${result.approved} anlatım onaylandı.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Toplu onay başarısız.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Konu anlatımları</h1><p className="text-gray-600">Anlatımları düzenleyin, oluşturun ve onaylayın.</p></div>
        <button type="button" onClick={startCreate} className="rounded bg-teal-700 px-4 py-2 text-white">Yeni anlatım</button>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }} className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Durum<select aria-label="Durum" value={status} onChange={(event) => { setStatus(event.target.value as Status | "ALL"); setPage(1); setSelected(null); }} className="mt-1 block rounded border p-2"><option value="DRAFT">Taslaklar</option><option value="APPROVED">Onaylı</option><option value="REJECTED">Reddedilen</option><option value="ALL">Tümü</option></select></label>
        <label className="text-sm">Ders<select aria-label="Ders filtresi" value={lessonId} onChange={(event) => { setLessonId(event.target.value); setTopicId(""); setPage(1); }} className="mt-1 block min-w-40 rounded border p-2"><option value="">Tüm dersler</option>{lessons.map((item) => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
        <label className="text-sm">Konu<select aria-label="Konu filtresi" value={topicId} onChange={(event) => { setTopicId(event.target.value); setPage(1); }} className="mt-1 block min-w-40 rounded border p-2"><option value="">Tüm konular</option>{filteredTopics.map((item) => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
        <label className="text-sm">Ara<input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Başlık veya içerik" className="mt-1 block rounded border p-2" /></label>
        <button type="submit" className="rounded border px-4 py-2">Ara</button>
        <label className="text-sm">Sayfa boyutu<select aria-label="Sayfa boyutu" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="mt-1 block rounded border p-2">{PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
        <span className="pb-2 text-sm text-gray-500">{total} kayıt</span>
      </form>
      {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded bg-teal-50 p-3 text-teal-800">{notice}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded border bg-white p-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={allChecked} disabled={loading || draftIds.length === 0} onChange={(event) => setChecked(event.target.checked ? draftIds : [])} />Bu sayfadaki taslakları seç</label>
            <button type="button" disabled={saving || checkedDraftIds.length === 0} onClick={() => void approveSelected()} className="ml-auto rounded bg-teal-700 px-3 py-2 text-white disabled:opacity-40">Seçilenleri onayla ({checkedDraftIds.length})</button>
          </div>
          {loading ? <p>Yükleniyor…</p> : items.length === 0 ? <p>Kayıt bulunamadı.</p> : items.map((item) => (
            <div key={item.id} className={`flex gap-3 rounded-lg border p-4 hover:border-teal-600 ${selected?.id === item.id ? "border-teal-600 bg-teal-50" : "bg-white"}`}>
              <input type="checkbox" aria-label={`${item.title} seç`} disabled={item.status !== "DRAFT"} checked={checked.includes(item.id)} onChange={(event) => setChecked((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />
              <button type="button" onClick={() => choose(item)} className="min-w-0 flex-1 text-left">
                <div className="flex justify-between gap-3"><strong>{item.title}</strong><span className="text-xs">{item.status}</span></div>
                <p className="mt-1 text-sm text-gray-500">{item.lesson?.displayName || item.lesson?.name || "Ders yok"} / {item.topic?.displayName || item.topic?.name || "Konu yok"} · {item._count.flashcards} kart</p>
                <p className="mt-2 line-clamp-2 text-sm text-gray-700">{item.content}</p>
                {item.imageAssetId && <span className="mt-1 block text-xs text-teal-700">Görsel eklendi</span>}
              </button>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button type="button" disabled={loading || page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Önceki</button>
            <span>{page} / {pageCount}</span>
            <button type="button" disabled={loading || page >= pageCount} onClick={() => setPage((current) => current + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Sonraki</button>
          </div>
        </div>
        {(selected || creating) && <div className="h-fit space-y-4 rounded-lg border bg-white p-5">
          <h2 className="text-lg font-semibold">{creating ? "Yeni konu anlatımı" : "Anlatımı düzenle"}</h2>
          {creating && <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Ders<select value={createLessonId} onChange={(event) => { setCreateLessonId(event.target.value); setCreateTopicId(""); }} className="mt-1 block w-full rounded border p-2"><option value="">Ders seçin</option>{lessons.map((item) => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
            <label className="text-sm">Konu<select value={createTopicId} disabled={!createLessonId} onChange={(event) => setCreateTopicId(event.target.value)} className="mt-1 block w-full rounded border p-2"><option value="">Konu seçin</option>{createTopics.map((item) => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
          </div>}
          <label className="block text-sm font-medium">Başlık<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} className="mt-1 block w-full rounded border p-2" /></label>
          <label className="block text-sm font-medium">Konu anlatımı<textarea value={content} onChange={(event) => setContent(event.target.value)} rows={16} className="mt-1 block w-full rounded border p-2" /></label>
          {creating ? <label className="block text-sm font-medium">Görsel (PNG, JPEG veya SVG; en fazla 10 MB)<input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0] ?? null; if (file && file.size > 10 * 1024 * 1024) { setError("Görsel 10 MB sınırını aşamaz."); event.target.value = ""; setImage(null); return; } setError(""); setImage(file); }} className="mt-1 block w-full rounded border p-2" /></label> : null}
          {(imagePreview || selected?.imageAssetId) && <Image unoptimized width={640} height={288} src={imagePreview || getVisualAssetUrl(selected!.imageAssetId!)} alt="Konu anlatımı görseli" className="max-h-72 max-w-full rounded border object-contain" />}
          {creating && <label className="block text-sm">Durum<select value={createStatus} onChange={(event) => setCreateStatus(event.target.value as "DRAFT" | "APPROVED")} className="mt-1 block rounded border p-2"><option value="DRAFT">Taslak</option><option value="APPROVED">Onaylı</option></select></label>}
          {selected?.knowledgePoint && <p className="rounded bg-gray-50 p-3 text-sm"><strong>Kaynak KP:</strong> {selected.knowledgePoint.fact}</p>}
          {selected?.originFlashcardId && <p className="text-xs text-gray-500">Kaynak flashcard: {selected.originFlashcardId}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={saving} onClick={() => void save()} className="rounded bg-gray-800 px-4 py-2 text-white disabled:opacity-40">{creating ? "Oluştur" : "Kaydet"}</button>
            {!creating && <><button type="button" disabled={saving} onClick={() => void save("APPROVED")} className="rounded bg-teal-700 px-4 py-2 text-white disabled:opacity-40">Kaydet ve onayla</button><button type="button" disabled={saving} onClick={() => void save("REJECTED")} className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-40">Reddet</button></>}
            <button type="button" disabled={saving} onClick={() => { setCreating(false); setSelected(null); }} className="rounded border px-4 py-2">İptal</button>
          </div>
        </div>}
      </div>
    </div>
  );
}
