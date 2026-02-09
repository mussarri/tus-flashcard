import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { theme } from '@theme/index';

/**
 * Progress Tab - Track learning progress and mastery
 * Purpose: Long-term tracking, mastery visualization
 */
export default function ProgressScreen() {
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // TODO: Fetch latest data from API
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRefreshing(false);
    }, []);

    // Mock data - will be replaced with real data from API/store
    const overallStats = {
        questionsSolved: 247,
        accuracy: 78,
        studyDays: 12,
        flashcardsReviewed: 156,
    };

    const topicMastery = [
        { id: '1', name: 'Anatomy', mastery: 85, color: theme.colors.cta },
        { id: '2', name: 'Physiology', mastery: 72, color: theme.colors.cta },
        { id: '3', name: 'Pathology', mastery: 65, color: theme.colors.warning },
        { id: '4', name: 'Pharmacology', mastery: 45, color: theme.colors.error },
        { id: '5', name: 'Microbiology', mastery: 58, color: theme.colors.warning },
    ];

    const knowledgeGrowth = {
        newLearned: 89,
        reinforced: 67,
    };

    const getMasteryColor = (mastery: number) => {
        if (mastery >= 70) return theme.colors.cta;
        if (mastery >= 50) return theme.colors.warning;
        return theme.colors.error;
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
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Progress</Text>
                    <Text style={styles.subtitle}>Track your learning journey</Text>
                </View>

                {/* Overall Stats */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Overview</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{overallStats.questionsSolved}</Text>
                            <Text style={styles.statLabel}>Questions Solved</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{overallStats.accuracy}%</Text>
                            <Text style={styles.statLabel}>Accuracy</Text>
                        </View>
                    </View>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{overallStats.studyDays}</Text>
                            <Text style={styles.statLabel}>Day Streak</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{overallStats.flashcardsReviewed}</Text>
                            <Text style={styles.statLabel}>Cards Reviewed</Text>
                        </View>
                    </View>
                </View>

                {/* Topic Mastery */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Topic Mastery</Text>
                    <View style={styles.masteryContainer}>
                        {topicMastery.map((topic) => (
                            <View key={topic.id} style={styles.masteryItem}>
                                <View style={styles.masteryHeader}>
                                    <Text style={styles.masteryName}>{topic.name}</Text>
                                    <Text style={[
                                        styles.masteryPercentage,
                                        { color: getMasteryColor(topic.mastery) }
                                    ]}>
                                        {topic.mastery}%
                                    </Text>
                                </View>
                                <View style={styles.masteryBarContainer}>
                                    <View
                                        style={[
                                            styles.masteryBarFill,
                                            {
                                                width: `${topic.mastery}%`,
                                                backgroundColor: getMasteryColor(topic.mastery)
                                            }
                                        ]}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Knowledge Growth */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Knowledge Growth</Text>
                    <View style={styles.growthContainer}>
                        <View style={styles.growthCard}>
                            <View style={[styles.growthIcon, { backgroundColor: theme.colors.primary }]}>
                                <Text style={styles.growthIconText}>+</Text>
                            </View>
                            <Text style={styles.growthValue}>{knowledgeGrowth.newLearned}</Text>
                            <Text style={styles.growthLabel}>New Concepts Learned</Text>
                        </View>
                        <View style={styles.growthCard}>
                            <View style={[styles.growthIcon, { backgroundColor: theme.colors.secondary }]}>
                                <Text style={styles.growthIconText}>↻</Text>
                            </View>
                            <Text style={styles.growthValue}>{knowledgeGrowth.reinforced}</Text>
                            <Text style={styles.growthLabel}>Concepts Reinforced</Text>
                        </View>
                    </View>
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
        paddingTop: theme.spacing.xl,
        paddingBottom: 100,
    },
    header: {
        marginBottom: theme.spacing.lg,
    },
    title: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes['2xl'],
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.md,
        color: theme.colors.gray[600],
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.lg,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.white,
        padding: theme.spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    statValue: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes['2xl'],
        color: theme.colors.primary,
        marginBottom: theme.spacing.xs,
    },
    statLabel: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.gray[600],
        textAlign: 'center',
    },
    masteryContainer: {
        backgroundColor: theme.colors.white,
        borderRadius: 12,
        padding: theme.spacing.md,
        ...theme.shadows.sm,
    },
    masteryItem: {
        marginBottom: theme.spacing.md,
    },
    masteryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    masteryName: {
        fontFamily: theme.typography.fonts.bodyBold,
        fontSize: theme.typography.sizes.md,
        color: theme.colors.text,
    },
    masteryPercentage: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.md,
    },
    masteryBarContainer: {
        height: 8,
        backgroundColor: theme.colors.gray[200],
        borderRadius: 4,
        overflow: 'hidden',
    },
    masteryBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    growthContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    growthCard: {
        flex: 1,
        backgroundColor: theme.colors.white,
        padding: theme.spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    growthIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.sm,
    },
    growthIconText: {
        fontSize: 24,
        color: theme.colors.white,
        fontWeight: 'bold',
    },
    growthValue: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.xl,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    growthLabel: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.gray[600],
        textAlign: 'center',
    },
});
