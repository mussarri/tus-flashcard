import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TopicExplanation } from '../types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  explanation: TopicExplanation | null;
  loading: boolean;
  error: string | null;
}

export default function TopicExplanationSheet({ visible, onDismiss, explanation, loading, error }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.heading}>Konu anlatımı</Text>
            <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Kapat">
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          {loading ? <ActivityIndicator style={styles.loading} /> : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : explanation ? (
            <ScrollView style={styles.content}>
              {explanation.status !== 'APPROVED' && (
                <Text style={styles.draft}>AI taslağı · editör incelemesinde</Text>
              )}
              <Text style={styles.title}>{explanation.title}</Text>
              <Text style={styles.body}>{explanation.content}</Text>
            </ScrollView>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '82%', minHeight: 230 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontSize: 19, fontWeight: '700', color: '#111827' },
  close: { fontSize: 22, color: '#4b5563', padding: 4 },
  loading: { marginTop: 48 },
  error: { color: '#b91c1c', marginTop: 28, fontSize: 15 },
  content: { marginTop: 16 },
  draft: { color: '#92400e', marginBottom: 12, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 25, color: '#374151', paddingBottom: 28 },
});
