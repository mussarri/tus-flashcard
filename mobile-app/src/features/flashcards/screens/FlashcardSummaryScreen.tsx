import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@theme/index';
import { useMastery } from '../hooks/useFlashcardApi';

/**
 * Flashcard Summary Screen
 * Displays session statistics and mastery progress
 */
export default function FlashcardSummaryScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const sessionId = params.sessionId as string;
    const cardsReviewed = parseInt(params.cardsReviewed as string, 10) || 0;
    const lessonName = params.lessonName as string || 'Unknown Lesson';

    // Fetch mastery data
    const { data: masteryData } = useMastery();

    const handleContinue = () => {
        router.push('/(tabs)/flashcards');
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.emoji}>🎉</Text>
                    <Text style={styles.title}>Session Complete!</Text>
                    <Text style={styles.subtitle}>Great work on your study session</Text>
                </View>

                {/* Stats Card */}
                <View style={styles.statsCard}>
                    <Text style={styles.statsTitle}>Session Statistics</Text>

                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Cards Reviewed</Text>
                        <Text style={styles.statValue}>{cardsReviewed}</Text>
                    </View>

                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Lesson</Text>
                        <Text style={styles.statValue}>{lessonName}</Text>
                    </View>

                    {/* TODO: Add more stats from backend when available */}
                    {/* - Time spent */}
                    {/* - Response breakdown (Again/Hard/Good/Easy) */}
                    {/* - Accuracy percentage */}
                </View>

                {/* Mastery Progress */}
                {masteryData && masteryData.overall !== undefined && (
                    <View style={styles.masteryCard}>
                        <Text style={styles.masteryTitle}>Overall Mastery</Text>
                        <View style={styles.masteryProgressContainer}>
                            <View style={styles.masteryProgressBar}>
                                <View
                                    style={[
                                        styles.masteryProgressFill,
                                        { width: `${masteryData.overall || 0}%` }
                                    ]}
                                />
                            </View>
                            <Text style={styles.masteryPercentage}>
                                {(masteryData.overall || 0).toFixed(0)}%
                            </Text>
                        </View>

                        {/* Lesson breakdown */}
                        {masteryData.byLesson && masteryData.byLesson.length > 0 && (
                            <View style={styles.lessonMasteryList}>
                                {masteryData.byLesson.slice(0, 3).map((lesson) => (
                                    <View key={lesson.lessonId} style={styles.lessonMasteryRow}>
                                        <Text style={styles.lessonMasteryName}>{lesson.lessonName}</Text>
                                        <View style={styles.lessonMasteryBar}>
                                            <View
                                                style={[
                                                    styles.lessonMasteryFill,
                                                    { width: `${lesson.masteryPercentage || 0}%` }
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.lessonMasteryPercentage}>
                                            {(lesson.masteryPercentage || 0).toFixed(0)}%
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Continue Button */}
                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleContinue}
                    activeOpacity={0.9}
                >
                    <Text style={styles.continueButtonText}>Continue</Text>
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
    content: {
        padding: theme.spacing.md,
        paddingTop: theme.spacing['2xl'],
        paddingBottom: 100,
    },
    header: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    emoji: {
        fontSize: 64,
        marginBottom: theme.spacing.md,
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
        textAlign: 'center',
    },
    statsCard: {
        backgroundColor: theme.colors.white,
        padding: theme.spacing.lg,
        borderRadius: 16,
        marginBottom: theme.spacing.md,
        ...theme.shadows.md,
    },
    statsTitle: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.lg,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray[100],
    },
    statLabel: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.md,
        color: theme.colors.gray[600],
    },
    statValue: {
        fontFamily: theme.typography.fonts.bodyBold,
        fontSize: theme.typography.sizes.md,
        color: theme.colors.text,
    },
    masteryCard: {
        backgroundColor: theme.colors.white,
        padding: theme.spacing.lg,
        borderRadius: 16,
        marginBottom: theme.spacing.md,
        ...theme.shadows.md,
    },
    masteryTitle: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.lg,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    masteryProgressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    masteryProgressBar: {
        flex: 1,
        height: 12,
        backgroundColor: theme.colors.gray[200],
        borderRadius: 6,
        overflow: 'hidden',
    },
    masteryProgressFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 6,
    },
    masteryPercentage: {
        fontFamily: theme.typography.fonts.bodyBold,
        fontSize: theme.typography.sizes.lg,
        color: theme.colors.primary,
        minWidth: 50,
        textAlign: 'right',
    },
    lessonMasteryList: {
        gap: theme.spacing.sm,
    },
    lessonMasteryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    lessonMasteryName: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.gray[600],
        width: 100,
    },
    lessonMasteryBar: {
        flex: 1,
        height: 8,
        backgroundColor: theme.colors.gray[200],
        borderRadius: 4,
        overflow: 'hidden',
    },
    lessonMasteryFill: {
        height: '100%',
        backgroundColor: theme.colors.secondary,
        borderRadius: 4,
    },
    lessonMasteryPercentage: {
        fontFamily: theme.typography.fonts.bodyBold,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.text,
        minWidth: 40,
        textAlign: 'right',
    },
    continueButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: theme.spacing.lg,
        ...theme.shadows.md,
    },
    continueButtonText: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.lg,
        color: theme.colors.white,
    },
});
