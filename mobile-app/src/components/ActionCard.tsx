import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@theme/index';

interface ActionCardProps {
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'accent';
}

export const ActionCard: React.FC<ActionCardProps> = ({
    title,
    description,
    icon,
    onPress,
    variant = 'primary',
}) => {
    // Determine colors based on variant
    const getColors = () => {
        switch (variant) {
            case 'secondary':
                return { bg: theme.colors.white, iconBg: theme.colors.secondary, icon: theme.colors.white };
            case 'accent':
                return { bg: theme.colors.white, iconBg: theme.colors.warning, icon: theme.colors.white };
            case 'primary':
            default:
                return { bg: theme.colors.white, iconBg: theme.colors.primary, icon: theme.colors.white };
        }
    };

    const colors = getColors();

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <View style={[styles.iconContainer, { backgroundColor: colors.iconBg }]}>
                <Ionicons name={icon} size={24} color={colors.icon} />
            </View>
            <View style={styles.contentContainer}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description}>{description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.gray[400]} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        borderRadius: 16,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        ...theme.shadows.sm,
        borderWidth: 1,
        borderColor: theme.colors.gray[100],
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
        ...theme.shadows.sm,
    },
    contentContainer: {
        flex: 1,
    },
    title: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.md,
        color: theme.colors.text,
        marginBottom: 4,
    },
    description: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.gray[500],
        lineHeight: 20,
    },
});
