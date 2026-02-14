import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { theme } from "@theme/index";
import { useDashboard, useStartSession } from "../hooks/useFlashcardApi";
import { SessionMode } from "../types";
import DashboardOverview from "../components/DashboardOverview";
import ModeSelector from "../components/ModeSelector";

/**
 * Flashcard Start Screen
 * Purpose: Lesson selection, Mode selection (SRS/Learn/Weakness), Card count
 */
export default function FlashcardStartScreen() {
  const router = useRouter();

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useDashboard();
  const startSessionMutation = useStartSession();

  // State    const [refreshing, setRefreshing] = useState(false);    const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [studyMode, setStudyMode] = useState<SessionMode>("SRS");
  const [cardCount, setCardCount] = useState<number>(20);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);

  const cardCountOptions = [10, 20, 30, 50];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Calculate total stats for overview
  const totalStats = useMemo(() => {
    if (!dashboardData?.overview) {
      return { review: 0, learning: 0, new: 0 };
    }
    const stats = Object.values(dashboardData.overview);
    return {
      review: stats.reduce((sum, s) => sum + s.due, 0),
      learning: stats.reduce((sum, s) => sum + s.learning, 0),
      new: stats.reduce((sum, s) => sum + s.new, 0),
    };
  }, [dashboardData]);

  const handleStart = async () => {
    if (!selectedLesson) return;

    try {
      const response = await startSessionMutation.mutateAsync({
        lessonId: selectedLesson,
        mode: studyMode,
        limit: cardCount,
      });

      alert("Bağlantı  " + response); // Telefon ekranında hatayı görmeni sağlar

      // Navigate to session screen with sessionId
      router.push({
        pathname: "/(flashcards)/session",
        params: {
          sessionId: response.sessionId,
          totalCards: response.totalCards.toString(),
          mode: response.mode,
        },
      });
    } catch (err) {
      console.error("Failed to start session:", err);
      // TODO: Show error toast/alert
    }
  };

  // Convert dashboard data to lessons array
  const lessons = dashboardData?.lessons || [];

  // Find selected lesson stats from overview
  const selectedLessonData = selectedLesson
    ? lessons.find((l) => l.id === selectedLesson)
    : null;

  const selectedLessonStats =
    selectedLessonData && dashboardData?.overview
      ? dashboardData.overview[selectedLessonData.name]
      : null;

  const availableCounts = selectedLessonStats
    ? {
        new: selectedLessonStats.new,
        due: selectedLessonStats.due,
        learning: selectedLessonStats.learning,
        hard: selectedLessonStats.hard || 0,
      }
    : { new: 0, due: 0, learning: 0, hard: 0 };

  const availableCards =
    studyMode === "SRS"
      ? availableCounts.due + availableCounts.learning
      : studyMode === "LEARN"
        ? availableCounts.new
        : availableCounts.due;

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Veriler yüklenemedi</Text>
        <Text style={styles.errorSubtext}>
          Lütfen daha sonra tekrar deneyin
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
        />
      }
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Flashcards</Text>
          <Text style={styles.subtitle}>Kartlarla çalış, bilgini pekiştir</Text>
        </View>

        {/* Dashboard Overview */}
        <DashboardOverview
          reviewCount={totalStats.review}
          learningCount={totalStats.learning}
          newCount={totalStats.new}
        />

        {/* Lesson Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Ders Seçin</Text>
          {lessons.map((lesson) => {
            const lessonStats = dashboardData?.overview?.[lesson.name];
            return (
              <TouchableOpacity
                key={lesson.id}
                style={[
                  styles.lessonCard,
                  selectedLesson === lesson.id && styles.lessonCardSelected,
                ]}
                onPress={() => setSelectedLesson(lesson.id)}
                activeOpacity={0.7}
              >
                <View style={styles.lessonContent}>
                  <Text
                    style={[
                      styles.lessonName,
                      selectedLesson === lesson.id && styles.lessonNameSelected,
                    ]}
                  >
                    {lesson.name}
                  </Text>
                  <View style={styles.lessonStats}>
                    <Text style={styles.lessonStat}>
                      {lessonStats?.due || 0} due
                    </Text>
                    <Text style={styles.lessonStatDivider}>•</Text>
                    <Text style={styles.lessonStat}>
                      {lessonStats?.learning || 0} learning
                    </Text>
                    <Text style={styles.lessonStatDivider}>•</Text>
                    <Text style={styles.lessonStat}>
                      {lessonStats?.new || 0} new
                    </Text>
                  </View>
                </View>
                {selectedLesson === lesson.id && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Study Mode Selection */}
        {selectedLesson && (
          <ModeSelector
            selectedMode={studyMode}
            onSelectMode={setStudyMode}
            availableCounts={availableCounts}
          />
        )}

        {/* Card Count Selection */}
        {selectedLesson && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Kart Sayısı</Text>
            <View style={styles.countContainer}>
              {cardCountOptions.map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.countButton,
                    cardCount === count && styles.countButtonSelected,
                  ]}
                  onPress={() => setCardCount(count)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.countButtonText,
                      cardCount === count && styles.countButtonTextSelected,
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Summary */}
        {selectedLesson && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Session Summary</Text>
            <Text style={styles.summaryText}>
              {cardCount} cards from {selectedLessonData?.name} ({studyMode}{" "}
              mode)
            </Text>
            <Text style={styles.summarySubtext}>
              {availableCards} cards available
            </Text>
          </View>
        )}

        {/* Start Button */}
        <TouchableOpacity
          style={[
            styles.startButton,
            (!selectedLesson || startSessionMutation.isPending) &&
              styles.startButtonDisabled,
          ]}
          onPress={handleStart}
          disabled={!selectedLesson || startSessionMutation.isPending}
          activeOpacity={0.9}
        >
          {startSessionMutation.isPending ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <Text style={styles.startButtonText}>Start Flashcards</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.gray[600],
    marginTop: theme.spacing.md,
  },
  errorText: {
    fontFamily: theme.typography.fonts.heading,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  errorSubtext: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[600],
  },
  content: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.xl,
    paddingBottom: 100,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.typography.fonts.heading,
    fontSize: theme.typography.sizes["2xl"],
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.gray[600],
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    fontFamily: theme.typography.fonts.bodyBold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  lessonCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: "transparent",
    ...theme.shadows.sm,
  },
  lessonCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.background,
  },
  lessonContent: {
    flex: 1,
  },
  lessonName: {
    fontFamily: theme.typography.fonts.heading,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    marginBottom: 4,
  },
  lessonNameSelected: {
    color: theme.colors.primary,
  },
  lessonStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  lessonStat: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[600],
  },
  lessonStatDivider: {
    marginHorizontal: theme.spacing.xs,
    color: theme.colors.gray[400],
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  modeContainer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  modeButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderColor: theme.colors.gray[200],
    alignItems: "center",
  },
  modeButtonSelected: {
    borderColor: theme.colors.secondary,
    backgroundColor: theme.colors.background,
  },
  modeButtonText: {
    fontFamily: theme.typography.fonts.bodyBold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[600],
  },
  modeButtonTextSelected: {
    color: theme.colors.secondary,
  },
  countContainer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  countButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderColor: theme.colors.gray[200],
    alignItems: "center",
  },
  countButtonSelected: {
    borderColor: theme.colors.cta,
    backgroundColor: theme.colors.background,
  },
  countButtonText: {
    fontFamily: theme.typography.fonts.bodyBold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.gray[600],
  },
  countButtonTextSelected: {
    color: theme.colors.cta,
  },
  summaryCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  summaryTitle: {
    fontFamily: theme.typography.fonts.bodyBold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  summaryText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    marginBottom: 4,
  },
  summarySubtext: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[600],
  },
  startButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: 16,
    alignItems: "center",
    ...theme.shadows.md,
  },
  startButtonDisabled: {
    backgroundColor: theme.colors.gray[300],
  },
  startButtonText: {
    fontFamily: theme.typography.fonts.heading,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.white,
  },
});
