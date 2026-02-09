import React, { useState, useCallback } from "react";
import { StyleSheet, ScrollView, View, Text, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { ActionCard } from "@components/ActionCard";
import { theme } from "@theme/index";
import { ThemedView } from "@components/themed-view";
import { ThemedText } from "@components/themed-text";

export default function QuestionsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Fetch latest data from API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            Solve Questions
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Test your knowledge and measure exam readiness
          </ThemedText>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start Practice</Text>
          <ActionCard
            title="New Session"
            description="Create a custom practice session filtered by subject and topic."
            icon="add-circle"
            variant="primary"
            onPress={() => router.push("/(question-bank)")}
          />
          <ActionCard
            title="Quick Start"
            description="Jump straight into a mixed set of high-yield questions."
            icon="flash"
            variant="accent"
            onPress={() => {
              // Can pre-fill params for quick start
              router.push({
                pathname: "/(question-bank)/session",
                params: { sourceType: "MIXED", lessonId: "l1" }, // Mock default
              });
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance & History</Text>
          <ActionCard
            title="History"
            description="Review your past sessions and see your progress."
            icon="time"
            variant="secondary"
            onPress={() => { }}
          />
          <ActionCard
            title="Weak Areas"
            description="Focus on topics where you need improvement."
            icon="analytics"
            variant="secondary"
            onPress={() => { }}
          />
        </View>

        {/* Stats Summary Widget (Visual Only) */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>1,240</Text>
            <Text style={styles.statLabel}>Questions Solved</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>68%</Text>
            <Text style={styles.statLabel}>Avg. Score</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  header: {
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 32,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.gray[600],
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontFamily: theme.typography.fonts.heading,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[500],
    marginBottom: theme.spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: 4,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    padding: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "space-between",
    ...theme.shadows.md,
    marginBottom: theme.spacing.xl,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontFamily: theme.typography.fonts.heading,
    fontSize: 24,
    color: theme.colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: theme.typography.fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});
