import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { flashcardApiService } from '../services';
import { TopicExplanation, TopicExplanationCatalog } from '../types';

const PAGE_SIZE = 20;

export default function TopicExplanationReviewScreen() {
  const params = useLocalSearchParams<{ lessonId?: string }>();
  const [catalog, setCatalog] = useState<TopicExplanationCatalog | null>(null);
  const [lessonId, setLessonId] = useState(params.lessonId || '');
  const [topicId, setTopicId] = useState('');
  const [page, setPage] = useState(1);
  const [index, setIndex] = useState<number | null>(null);
  const [items, setItems] = useState<TopicExplanation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setCatalogError(null);
    flashcardApiService.getTopicExplanationCatalog()
      .then((result) => { if (active) setCatalog(result); })
      .catch(() => { if (active) setCatalogError('Ders ve konu listesi yüklenemedi.'); });
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    flashcardApiService.getTopicExplanations({
      lessonId: lessonId || undefined,
      topicId: topicId || undefined,
      page,
      pageSize: PAGE_SIZE,
    }).then((result) => {
      if (!active) return;
      setItems(result.items);
      setTotal(result.total);
      setIndex((current) => current === null ? null : Math.min(current, Math.max(result.items.length - 1, 0)));
    }).catch(() => {
      if (active) setError('Konu anlatımları yüklenemedi.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lessonId, topicId, page, reload]);

  const chooseLesson = (id: string) => {
    setLessonId(id);
    setTopicId('');
    setPage(1);
    setIndex(null);
  };
  const chooseTopic = (id: string) => {
    setTopicId(id);
    setPage(1);
    setIndex(null);
  };
  const previous = () => {
    if (index === null) return;
    if (index > 0) setIndex(index - 1);
    else if (page > 1) { setIndex(PAGE_SIZE - 1); setPage(page - 1); }
  };
  const next = () => {
    if (index === null) return;
    if (index + 1 < items.length) setIndex(index + 1);
    else if (page * PAGE_SIZE < total) { setIndex(0); setPage(page + 1); }
  };
  const position = index === null ? 0 : (page - 1) * PAGE_SIZE + index + 1;
  const current = index === null ? null : items[index];
  const visibleTopics = catalog?.topics.filter((topic) => !lessonId || topic.lessonId === lessonId) || [];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.heading}>Konu anlatımı tekrarı</Text>
      </View>
      {index !== null && <Pressable onPress={() => setIndex(null)} accessibilityRole="button" style={styles.backButton}><Text style={styles.backText}>‹ Listeye dön</Text></Pressable>}
      {index === null && <>
      <Text style={styles.intro}>Ders ve konu seç, okumak istediğin anlatıma dokun.</Text>
      {catalogError && <Pressable onPress={() => setReload((value) => value + 1)}><Text style={styles.error}>{catalogError} Tekrar dene</Text></Pressable>}
      <Text style={styles.filterLabel}>Ders</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        <Pressable onPress={() => chooseLesson('')} style={[styles.chip, !lessonId && styles.selectedChip]}><Text style={[styles.chipText, !lessonId && styles.selectedChipText]}>Tümü</Text></Pressable>
        {catalog?.lessons.map((lesson) => <Pressable key={lesson.id} onPress={() => chooseLesson(lesson.id)} style={[styles.chip, lessonId === lesson.id && styles.selectedChip]}><Text style={[styles.chipText, lessonId === lesson.id && styles.selectedChipText]}>{lesson.displayName || lesson.name}</Text></Pressable>)}
      </ScrollView>
      <Text style={styles.filterLabel}>Konu</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        <Pressable onPress={() => chooseTopic('')} style={[styles.chip, !topicId && styles.selectedChip]}><Text style={[styles.chipText, !topicId && styles.selectedChipText]}>Tümü</Text></Pressable>
        {visibleTopics.map((topic) => <Pressable key={topic.id} onPress={() => chooseTopic(topic.id)} style={[styles.chip, topicId === topic.id && styles.selectedChip]}><Text style={[styles.chipText, topicId === topic.id && styles.selectedChipText]}>{topic.displayName || topic.name}</Text></Pressable>)}
      </ScrollView>
      </>}

      {loading ? <ActivityIndicator style={styles.loading} size="large" /> : error ? (
        <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable onPress={() => setReload((value) => value + 1)}><Text style={styles.retry}>Tekrar dene</Text></Pressable></View>
      ) : items.length === 0 ? (
        <View style={styles.center}><Text style={styles.empty}>Bu seçimde onaylı konu anlatımı bulunamadı.</Text></View>
      ) : index === null ? (
        <>
          <Text style={styles.listCount}>{total} anlatım</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {items.map((item, itemIndex) => (
              <Pressable key={item.id} onPress={() => setIndex(itemIndex)} accessibilityRole="button" style={styles.listItem}>
                <Text style={styles.listContext}>{item.lesson?.displayName || item.lesson?.name || 'Ders'} · {item.topic?.displayName || item.topic?.name || 'Konu'}</Text>
                <Text style={styles.listTitle}>{item.title}</Text>
                {item.imageAssetId && <Text style={styles.listImage}>Görsel içerir</Text>}
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.navigation}>
            <Pressable onPress={() => setPage((value) => value - 1)} disabled={page <= 1} style={[styles.navButton, page <= 1 && styles.disabled]}><Text style={styles.navText}>Önceki sayfa</Text></Pressable>
            <Text style={styles.pageLabel}>{page} / {Math.ceil(total / PAGE_SIZE)}</Text>
            <Pressable onPress={() => setPage((value) => value + 1)} disabled={page * PAGE_SIZE >= total} style={[styles.navButton, page * PAGE_SIZE >= total && styles.disabled]}><Text style={styles.navText}>Sonraki sayfa</Text></Pressable>
          </View>
        </>
      ) : current ? (
        <>
          <Text style={styles.position}>{position} / {total}</Text>
          <ScrollView style={styles.card} contentContainerStyle={styles.cardContent}>
            <Text style={styles.context}>{current.lesson?.displayName || current.lesson?.name || 'Ders'} · {current.topic?.displayName || current.topic?.name || 'Konu'}</Text>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.body}>{current.content}</Text>
            {current.imageAssetId && <Image source={{ uri: `${(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/student/flashcards/visual-assets/${current.imageAssetId}` }} style={{ width: '100%', height: 260, marginTop: 16 }} contentFit="contain" accessibilityLabel="Konu anlatımı görseli" />}
          </ScrollView>
          <View style={styles.navigation}>
            <Pressable onPress={previous} disabled={position <= 1} style={[styles.navButton, position <= 1 && styles.disabled]}><Text style={styles.navText}>Önceki</Text></Pressable>
            <Pressable onPress={next} disabled={position >= total} style={[styles.navButton, position >= total && styles.disabled]}><Text style={styles.navText}>Sonraki</Text></Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 18, paddingTop: 48, paddingBottom: 104, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  heading: { color: '#111827', fontSize: 22, fontWeight: '700' },
  intro: { color: '#64748b', marginTop: 8, marginBottom: 18 },
  backButton: { marginTop: 14, marginBottom: 16, alignSelf: 'flex-start' },
  backText: { color: '#0f766e', fontSize: 16, fontWeight: '700' },
  filterLabel: { color: '#334155', fontWeight: '700', marginBottom: 6 },
  filterRow: { flexGrow: 0, marginBottom: 14 },
  chip: { borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: '#fff' },
  selectedChip: { borderColor: '#0f766e', backgroundColor: '#0f766e' },
  chipText: { color: '#334155' },
  selectedChipText: { color: '#fff', fontWeight: '700' },
  loading: { marginTop: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#b91c1c', textAlign: 'center' },
  retry: { color: '#0f766e', fontWeight: '700', marginTop: 16 },
  empty: { color: '#64748b', textAlign: 'center' },
  listCount: { color: '#64748b', marginBottom: 8 },
  list: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 16 },
  listItem: { borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', padding: 16 },
  listContext: { color: '#0f766e', fontSize: 13, marginBottom: 7 },
  listTitle: { color: '#111827', fontSize: 17, fontWeight: '700' },
  listImage: { color: '#64748b', fontSize: 12, marginTop: 8 },
  pageLabel: { color: '#64748b', alignSelf: 'center' },
  position: { textAlign: 'right', color: '#64748b', marginBottom: 8 },
  card: { flex: 1, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  cardContent: { padding: 22, paddingBottom: 38 },
  context: { color: '#0f766e', fontWeight: '600', marginBottom: 12 },
  title: { color: '#111827', fontSize: 22, fontWeight: '700', marginBottom: 16 },
  body: { color: '#334155', fontSize: 17, lineHeight: 28 },
  navigation: { flexDirection: 'row', gap: 12, marginTop: 16 },
  navButton: { flex: 1, backgroundColor: '#0f766e', borderRadius: 10, alignItems: 'center', paddingVertical: 14 },
  disabled: { opacity: 0.4 },
  navText: { color: '#fff', fontWeight: '700' },
});
