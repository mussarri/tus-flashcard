import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@theme/index';
import { Ionicons } from '@expo/vector-icons';

export const SessionSummaryScreen: React.FC = () => {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Parse session stats from params
    const totalQuestions = parseInt(params.totalQuestions as string || '0', 10);
    const correctCount = parseInt(params.correctCount as string || '0', 10);
    const timeSpentMs = parseInt(params.timeSpentMs as string || '0', 10);

    const incorrectCount = totalQuestions - correctCount;
    const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions * 100) : 0;
    const avgTimePerQuestion = totalQuestions > 0 ? Math.floor(timeSpentMs / totalQuestions / 1000) : 0;

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Ionicons 
                    name={accuracy >= 70 ? "checkmark-circle" : "close-circle"} 
                    size={64} 
                    color={accuracy >= 70 ? theme.colors.cta : theme.colors.warning} 
                />
                <Text style={styles.title}>Session Complete!</Text>
                <Text style={styles.subtitle}>
                    {accuracy >= 90 ? 'Excellent work!' : accuracy >= 70 ? 'Good job!' : 'Keep practicing!'}
                </Text>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsGrid}>
                {/* Accuracy */}
                <View style={[styles.statCard, styles.statCardLarge]}>
                    <Text style={styles.statValue}>{accuracy.toFixed(0)}%</Text>
                    <Text style={styles.statLabel}>Accuracy</Text>
                </View>

                {/* Correct */}
                <View style={styles.statCard}>
                    <View style={styles.statRow}>
                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.cta} />
                        <Text style={[styles.statValue, styles.statValueSmall]}>{correctCount}</Text>
                    </View>
                    <Text style={styles.statLabel}>Correct</Text>
                </View>

                {/* Incorrect */}
                <View style={styles.statCard}>
                    <View style={styles.statRow}>
                        <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                        <Text style={[styles.statValue, styles.statValueSmall]}>{incorrectCount}</Text>
                    </View>
                    <Text style={styles.statLabel}>Incorrect</Text>
                </View>

                {/* Time */}
                <View style={styles.statCard}>
                    <View style={styles.statRow}>
                        <Ionicons name="time" size={24} color={theme.colors.gray[500]} />
                        <Text style={[styles.statValue, styles.statValueSmall]}>{avgTimePerQuestion}s</Text>
                    </View>
                    <Text style={styles.statLabel}>Avg Time</Text>
                </View>

                {/* Total */}
                <View style={styles.statCard}>
                    <View style={styles.statRow}>
                        <Ionicons name="list" size={24} color={theme.colors.primary} />
                        <Text style={[styles.statValue, styles.statValueSmall]}>{totalQuestions}</Text>
                    </View>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
                {incorrectCount > 0 && (
                    <TouchableOpacity
                        style={[styles.button, styles.retryButton]}
                        onPress={() => {
                            // TODO: Implement retry wrong questions
                            router.replace('/(question-bank)');
                        }}
                    >
                        <Ionicons name="refresh" size={20} color={theme.colors.white} style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Retry Wrong Questions ({incorrectCount})</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => router.replace('/(question-bank)')}
                >
                    <Ionicons name="play" size={20} color={theme.colors.white} style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Start New Session</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={() => router.push('/(tabs)')}
                >
                    <Text style={[styles.buttonText, styles.secondaryButtonText]}>Back to Home</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.xl,
    },
    title: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes['2xl'],
        color: theme.colors.text,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.lg,
        color: theme.colors.gray[600],
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xl,
    },
    statCard: {
        backgroundColor: theme.colors.white,
        borderRadius: 12,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        width: '48%',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    statCardLarge: {
        width: '100%',
        paddingVertical: theme.spacing.lg,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    statValue: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: 36,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    statValueSmall: {
        fontSize: 24,
        marginBottom: 0,
    },
    statLabel: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.gray[600],
    },
    actionsContainer: {
        width: '100%',
    },
    button: {
        width: '100%',
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: theme.spacing.md,
    },
    buttonIcon: {
        marginRight: theme.spacing.xs,
    },
    buttonText: {
        color: theme.colors.white,
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.md,
    },
    retryButton: {
        backgroundColor: theme.colors.warning,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    secondaryButtonText: {
        color: theme.colors.primary,
    },
});
