import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import { theme } from "@theme/index";
import { SourceCard } from "../components/Selection/SourceCard";
import { LessonPicker } from "../components/Selection/LessonPicker";
import { ThemedText } from "@components/themed-text";
import { Button } from "@components/Button/Button";
import { SourceType } from "../types";
import { useAllLessons } from "../queries";
import { Collapsible } from "@components/ui/collapsible";
import { Ionicons } from "@expo/vector-icons";

// Enable LayoutAnimation on Android (skip in New Architecture)
const isNewArchitecture = Boolean((globalThis as any).__turboModuleProxy);
if (
  Platform.OS === "android" &&
  !isNewArchitecture &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const QuestionSelectionScreen = () => {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const { data: lessons = [], isLoading: isLoadingLessons } = useAllLessons();

  // Derived topics from selected lesson
  const selectedLesson = lessons.find((l) => l.id === selectedLessonId);
  const topics = selectedLesson?.topics || [];

  const handleSourceSelect = (type: SourceType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSourceType(type);
  };

  const handleLessonSelect = (lessonId: string) => {
    // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // Optional: animate selection
    setSelectedLessonId(lessonId);
    // Optional: clear topic if lesson changes
    if (selectedLessonId !== lessonId) {
      setSelectedTopicId(null);
    }
  };

  const handleStartSession = () => {
    if (!sourceType || !selectedLessonId) {
      Alert.alert(
        "Selection Incomplete",
        "Please select a source and a lesson to start.",
      );
      return;
    }

    router.push({
      pathname: "/(question-bank)/session",
      params: {
        sourceType,
        lessonId: selectedLessonId,
        topicId: selectedTopicId || "",
      },
    });
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Step 1: Choose Source
      </ThemedText>
      <SourceCard
        type="EXAM_REPLICA"
        title="Past Exam Questions"
        description="Real questions from previous years (2018-2024)"
        icon="library"
        isSelected={sourceType === "EXAM_REPLICA"}
        onSelect={handleSourceSelect}
      />
      <SourceCard
        type="AI_GENERATED"
        title="AI Practice Questions"
        description="Unlimited generated questions based on your weak spots"
        icon="hardware-chip"
        isSelected={sourceType === "AI_GENERATED"}
        onSelect={handleSourceSelect}
      />
      <SourceCard
        type="MIXED"
        title="Mixed Mode"
        description="Balanced mix of past questions and AI variations"
        icon="shuffle"
        isSelected={sourceType === "MIXED"}
        onSelect={handleSourceSelect}
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Step 2: Select Lesson
        </ThemedText>
        <Ionicons name="checkmark-circle" size={24} color={theme.colors.cta} />
      </View>

      <LessonPicker
        lessons={lessons}
        selectedLessonId={selectedLessonId}
        onSelect={handleLessonSelect}
        isLoading={isLoadingLessons}
      />

      {/* Optional Step 3: Filters inside Step 2 view for simplicity */}
      {selectedLessonId && topics.length > 0 && (
        <View style={styles.filtersContainer}>
          <Collapsible title="Advanced Filters (Optional)">
            <Text style={styles.subLabel}>Filter by Topic:</Text>
            <View style={styles.topicsGrid}>
              {topics.map((topic) => (
                <Button
                  key={topic.id}
                  title={topic.name}
                  variant={selectedTopicId === topic.id ? "primary" : "outline"}
                  size="small"
                  onPress={() =>
                    setSelectedTopicId(
                      selectedTopicId === topic.id ? null : topic.id,
                    )
                  }
                  style={styles.topicChip}
                />
              ))}
              {topics.length === 0 && (
                <Text style={styles.emptyText}>
                  No specific topics available
                </Text>
              )}
            </View>
          </Collapsible>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderStep1()}

        {sourceType && renderStep2()}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Start Session"
          onPress={handleStartSession}
          disabled={!sourceType || !selectedLessonId}
          size="large"
          fullWidth
          iconRight="arrow-forward"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  stepContainer: {
    marginBottom: theme.spacing.xl,
  },
  stepTitle: {
    marginBottom: theme.spacing.md,
    color: theme.colors.primary,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderColor: theme.colors.gray[200],
    paddingBottom: Platform.OS === "ios" ? 30 : theme.spacing.md,
  },
  filtersContainer: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  subLabel: {
    fontFamily: theme.typography.fonts.subheading,
    color: theme.colors.gray[600],
    marginBottom: theme.spacing.sm,
  },
  topicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  topicChip: {
    marginBottom: theme.spacing.xs,
    minWidth: "30%",
  },
  emptyText: {
    color: theme.colors.gray[400],
    fontStyle: "italic",
  },
});
