import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@theme/index';
import { useSessionSummary } from '../hooks/useFlashcardQueries';
import { CardType, CORE_CARD_TYPES, INTERMEDIATE_CARD_TYPES, ADVANCED_CARD_TYPES } from '../types';

/**
 * Session Summary Screen
 * Post-session analytics and recommendations
 */
export default function SessionSummaryScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const sessionId = params.sessionId as string;

    const { data: summary, isLoading } = useSessionSummary(sessionId, !!sessionId);

    if (isLoading || !summary) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Loading summary...</Text>
            </View>
        );
    }

    const accuracy = summary.totalCards > 0
        ? Math.round((summary.correctCards / summary.totalCards) * 100)
        : 0;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Session Complete! 🎉</Text>
                    <Text style={styles.subtitle}>Great work on your flashcards</Text>
                </View>

                {/* Stats Overview */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{summary.totalCards}</Text>
                        <Text style={styles.statLabel}>Cards Reviewed</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                            {accuracy}%
                        </Text>
                        <Text style={styles.statLabel}>Accuracy</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{formatTime(summary.timeSpent)}</Text>
                        <Text style={styles.statLabel}>Time Spent</Text>
                    </View>
                </View>

                {/* Mastery by Tier */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Mastery by Tier</Text>
                    <View style={styles.tierContainer}>
                        <View style={styles.tierCard}>
                            <View style={[styles.tierBadge, { backgroundColor: theme.colors.primary }]}>
                                <Text style={styles.tierBadgeText}>CORE</Text>
                            </View>
                            <Text style={styles.tierValue}>
                                {Math.round(summary.masteryByTier.core * 100)}%
                            </Text>
                        </View>
                        <View style={styles.tierCard}>
                            <View style={[styles.tierBadge, { backgroundColor: theme.colors.secondary }]}>
                                <Text style={styles.tierBadgeText}>INTERMEDIATE</Text>
                            </View>
                            <Text style={styles.tierValue}>
                                {Math.round(summary.masteryByTier.intermediate * 100)}%
                            </Text>
                        </View>
                        <View style={styles.tierCard}>
                            <View style={[styles.tierBadge, { backgroundColor: theme.colors.cta }]}>
                                <Text style={styles.tierBadgeText}>ADVANCED</Text>
                            </View>
                            <Text style={styles.tierValue}>
                                {Math.round(summary.masteryByTier.advanced * 100)}%
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Cards by Type */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cards by Type</Text>
                    <View style={styles.cardTypeList}>
                        {Object.entries(summary.cardsByType).map(([type, count]) => (
                            <View key={type} style={styles.cardTypeRow}>
                                <Text style={styles.cardTypeName}>{type.replace(/_/g, ' ')}</Text>
                                <Text style={styles.cardTypeCount}>{count}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Weak Patterns */}
                {summary.weakPatterns.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Areas to Review</Text>
                        <View style={styles.weakPatternsList}>
                            {summary.weakPatterns.map((pattern, index) => (
                                <View key={index} style={styles.weakPatternCard}>
                                    <Text style={styles.weakPatternText}>{pattern}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Recommended Backtrack */}
                {summary.recommendedBacktrack.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Recommended Next Session</Text>
                        <Text style={styles.recommendationText}>
                            Based on your performance, we recommend reviewing these foundational patterns:
                        </Text>
                        <View style={styles.recommendationList}>
                            {summary.recommendedBacktrack.map((pattern, index) => (
                                <View key={index} style={styles.recommendationItem}>
                                    <View style={styles.recommendationBullet} />
                                    <Text style={styles.recommendationItemText}>{pattern}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push('/flashcards')}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.primaryButtonText}>Start New Session</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.push('/(tabs)')}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.secondaryButtonText}>Back to Home</Text>
                    </TouchableOpacity>
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
        alignItems: 'center',
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
    statsContainer: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
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
        fontSize: theme.typography.sizes.xl,
        color: theme.colors.text,
        marginBottom: 4,
    },
    statLabel: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.gray[600],
        textAlign: 'center',
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        fontFamily: theme.typography.fonts.bodyBold,
        fontSize: theme.typography.sizes.md,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    tierContainer: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    tierCard: {
        flex: 1,
        backgroundColor: theme.colors.white,
        padding: theme.spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    tierBadge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: theme.spacing.xs,
    },
    tierBadgeText: {
        fontFamily: theme.typography.fonts.bodyBold,
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.white,
        textTransform: 'uppercase',
    },
    tierValue: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.lg,
        color: theme.colors.text,
    },
    cardTypeList: {
        backgroundColor: theme.colors.white,
        borderRadius: 12,
        padding: theme.spacing.md,
        ...theme.shadows.sm,
    },
    cardTypeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.xs,
    },
    cardTypeName: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.text,
        textTransform: 'capitalize',
    },
    cardTypeCount: {
        fontFamily: theme.typography.fonts.bodyBold,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.primary,
    },
    weakPatternsList: {
        gap: theme.spacing.sm,
    },
    weakPatternCard: {
        backgroundColor: '#FEF3C7',
        padding: theme.spacing.md,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    weakPatternText: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.sm,
        color: '#92400E',
    },
    recommendationText: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.gray[600],
        marginBottom: theme.spacing.sm,
    },
    recommendationList: {
        gap: theme.spacing.xs,
    },
    recommendationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.sm,
    },
    recommendationBullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.primary,
        marginTop: 8,
    },
    recommendationItemText: {
        flex: 1,
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.text,
    },
    actions: {
        gap: theme.spacing.sm,
        marginTop: theme.spacing.lg,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: 16,
        alignItems: 'center',
        ...theme.shadows.md,
    },
    primaryButtonText: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.lg,
        color: theme.colors.white,
    },
    secondaryButton: {
        backgroundColor: theme.colors.white,
        padding: theme.spacing.lg,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.gray[200],
    },
    secondaryButtonText: {
        fontFamily: theme.typography.fonts.bodyBold,
        fontSize: theme.typography.sizes.lg,
        color: theme.colors.text,
    },
    loadingText: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.md,
        color: theme.colors.gray[600],
        textAlign: 'center',
        marginTop: 100,
    },
});
