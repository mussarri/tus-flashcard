import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@theme/index';

interface DashboardOverviewProps {
    reviewCount: number;   // due cards
    learningCount: number; // learning cards
    newCount: number;      // new cards
    easyCount: number;     // mastered cards
}

/**
 * Dashboard Overview Component
 * Displays daily summary with card counts
 */
const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    reviewCount,
    learningCount,
    newCount,
    easyCount,
}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>📚 Bugün</Text>

            <View style={styles.statsContainer}>
                {/* Review Cards */}
                <View style={styles.statRow}>
                    <Text style={styles.emoji}>🔴</Text>
                    <Text style={styles.statLabel}>İncelenmeli</Text>
                    <Text style={styles.statCount}>{reviewCount}</Text>
                </View>

                {/* Learning Cards */}
                <View style={styles.statRow}>
                    <Text style={styles.emoji}>🟡</Text>
                    <Text style={styles.statLabel}>Öğreniliyor</Text>
                    <Text style={styles.statCount}>{learningCount}</Text>
                </View>

                {/* New Cards */}
                <View style={styles.statRow}>
                    <Text style={styles.emoji}>🟢</Text>
                    <Text style={styles.statLabel}>Yeni</Text>
                    <Text style={styles.statCount}>{newCount}</Text>
                </View>

                {/* Easy Cards */}
                <View style={styles.statRow}>
                    <Text style={styles.emoji}>✅</Text>
                    <Text style={styles.statLabel}>Kolay</Text>
                    <Text style={styles.statCount}>{easyCount}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.white,
        borderRadius: 16,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        ...theme.shadows.sm,
    },
    title: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.lg,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    statsContainer: {
        gap: theme.spacing.sm,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.xs,
    },
    emoji: {
        fontSize: 20,
        marginRight: theme.spacing.sm,
    },
    statLabel: {
        flex: 1,
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.md,
        color: theme.colors.text,
    },
    statCount: {
        fontFamily: theme.typography.fonts.bodyBold,
        fontSize: theme.typography.sizes.md,
        color: theme.colors.gray[700],
    },
});

export default DashboardOverview;
