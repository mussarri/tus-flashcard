import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@theme/index';
import { ActionCard } from '@components/ActionCard';
import { StatCard } from '@components/StatCard';

/**
 * Home Screen - Daily focus, Resume learning, Motivation
 * Purpose: Provide quick access to continue learning and view progress
 */
export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Mock data - will be replaced with real data from API/store
  const userName = 'Student';
  const dailyGoal = { current: 15, target: 20 };
  const stats = {
    questionsSolved: 247,
    accuracy: 78,
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Fetch latest data from API
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
      }
    >
      <View style={styles.content}>
        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{userName}</Text>

          {/* Daily Goal Indicator */}
          <View style={styles.goalContainer}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalLabel}>Today&apos;s Goal</Text>
              <Text style={styles.goalProgress}>
                {dailyGoal.current}/{dailyGoal.target} questions
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${(dailyGoal.current / dailyGoal.target) * 100}%` }
                ]}
              />
            </View>
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => router.push('/(question-bank)')}
          activeOpacity={0.9}
        >
          <View style={styles.continueContent}>
            <Text style={styles.continueTitle}>Continue Learning</Text>
            <Text style={styles.continueSubtitle}>Resume your last session</Text>
          </View>
          <View style={styles.continueIcon}>
            <Text style={styles.continueIconText}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
          <View style={styles.statsRow}>
            <StatCard
              label="Questions Solved"
              value={stats.questionsSolved}
              variant="primary"
            />
            <View style={styles.statsSpacer} />
            <StatCard
              label="Accuracy"
              value={`${stats.accuracy}%`}
              variant="secondary"
            />
          </View>
        </View>

        {/* Suggested Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Start Learning</Text>

          <ActionCard
            title="Study Flashcards"
            description="Learn core medical concepts efficiently"
            icon="book"
            variant="primary"
            onPress={() => router.push('/flashcards')}
          />

          <ActionCard
            title="Solve Questions"
            description="Test your knowledge with practice questions"
            icon="create"
            variant="secondary"
            onPress={() => router.push('/questions')}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing['xl'],
    paddingBottom: 100, // Account for bottom tab bar
  },
  greetingSection: {
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.gray[600],
  },
  userName: {
    fontFamily: theme.typography.fonts.heading,
    fontSize: theme.typography.sizes['2xl'],
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  goalContainer: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: 12,
    ...theme.shadows.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  goalLabel: {
    fontFamily: theme.typography.fonts.bodyBold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  goalProgress: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[600],
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: theme.colors.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.cta,
    borderRadius: 4,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: 16,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  continueContent: {
    flex: 1,
  },
  continueTitle: {
    fontFamily: theme.typography.fonts.heading,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.white,
    marginBottom: 4,
  },
  continueSubtitle: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.white,
    opacity: 0.9,
  },
  continueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueIconText: {
    fontSize: 20,
    color: theme.colors.white,
  },
  statsSection: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontFamily: theme.typography.fonts.heading,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statsSpacer: {
    width: theme.spacing.md,
  },
  actionsSection: {
    marginBottom: theme.spacing.lg,
  },
});
