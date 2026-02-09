import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@theme/index';
import { SourceType } from '../../types';

interface SourceCardProps {
    type: SourceType;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    isSelected: boolean;
    onSelect: (type: SourceType) => void;
}

export const SourceCard: React.FC<SourceCardProps> = ({
    type,
    title,
    description,
    icon,
    isSelected,
    onSelect,
}) => {
    return (
        <TouchableOpacity
            style={[styles.container, isSelected && styles.selectedContainer]}
            onPress={() => onSelect(type)}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, isSelected && styles.selectedIconContainer]}>
                <Ionicons
                    name={icon}
                    size={24}
                    color={isSelected ? theme.colors.cta : theme.colors.gray[500]}
                />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.title, isSelected && styles.selectedText]}>{title}</Text>
                <Text style={styles.description}>{description}</Text>
            </View>
            {isSelected && (
                <View style={styles.checkIcon}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.cta} />
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        borderRadius: 12,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.gray[200],
        ...theme.shadows.sm,
    },
    selectedContainer: {
        borderColor: theme.colors.cta,
        backgroundColor: theme.colors.background,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.gray[100],
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
    },
    selectedIconContainer: {
        backgroundColor: '#DCFCE7', // Light green
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.md,
        color: theme.colors.text,
        marginBottom: 2,
    },
    selectedText: {
        color: theme.colors.cta,
    },
    description: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.gray[500],
    },
    checkIcon: {
        marginLeft: theme.spacing.sm,
    },
});
