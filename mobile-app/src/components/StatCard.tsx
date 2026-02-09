import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@theme/index';

interface StatCardProps {
    label: string;
    value: string | number;
    variant?: 'primary' | 'secondary';
}

/**
 * StatCard - Display a single statistic
 * Used in Home screen for quick stats overview
 */
export const StatCard: React.FC<StatCardProps> = ({ label, value, variant = 'primary' }) => {
    const bgColor = variant === 'primary' ? theme.colors.primary : theme.colors.secondary;

    return (
        <View style={[styles.card, { backgroundColor: bgColor }]}>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.label}>{label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        padding: theme.spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 80,
        ...theme.shadows.sm,
    },
    value: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.xl,
        color: theme.colors.white,
        marginBottom: theme.spacing.xs,
    },
    label: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.white,
        opacity: 0.9,
    },
});
