import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@theme/index';

interface DashboardOverviewProps {
    hardCount: number;
    mediumCount: number;
    newCount: number;
    easyCount: number;
}

/**
 * Dashboard Overview Component
 * Displays daily summary with card counts
 */
const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    hardCount,
    mediumCount,
    newCount,
    easyCount,
}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>📚 Bugün</Text>

            <View style={styles.statsContainer}>
                {/* Hard Cards */}
                <View style={styles.statRow}>
                    <Text style={styles.emoji}>🔴</Text>
                    <Text style={styles.statLabel}>Zor</Text>
                    <Text style={styles.statCount}>{hardCount}</Text>
                </View>

                {/* Medium Cards */}
                <View style={styles.statRow}>
                    <Text style={styles.emoji}>🟡</Text>
                    <Text style={styles.statLabel}>Orta</Text>
                    <Text style={styles.statCount}>{mediumCount}</Text>
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
