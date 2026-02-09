import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@theme/index';
import { SessionMode } from '../types';
import { MODE_CONFIG } from '../constants/flashcardColors';

interface ModeSelectorProps {
    selectedMode: SessionMode;
    onSelectMode: (mode: SessionMode) => void;
    availableCounts?: {
        new: number;
        due: number;
        learning: number;
        hard: number;
    };
}

/**
 * Mode Selector Component
 * Radio button selector for study mode with visual feedback
 */
const ModeSelector: React.FC<ModeSelectorProps> = ({
    selectedMode,
    onSelectMode,
    availableCounts,
}) => {
    const modes: SessionMode[] = ['LEARN', 'WEAKNESS', 'SRS'];

    const getAvailableCount = (mode: SessionMode): number => {
        if (!availableCounts) return 0;

        switch (mode) {
            case 'LEARN':
                return availableCounts.new;
            case 'WEAKNESS':
                return availableCounts.hard; // Only HARD cards
            case 'SRS':
                return availableCounts.due + availableCounts.learning;
            default:
                return 0;
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Çalışma Modu</Text>

            <View style={styles.modesContainer}>
                {modes.map((mode) => {
                    const config = MODE_CONFIG[mode];
                    const isSelected = selectedMode === mode;
                    const count = getAvailableCount(mode);

                    return (
                        <TouchableOpacity
                            key={mode}
                            style={[
                                styles.modeOption,
                                isSelected && styles.modeOptionSelected,
                            ]}
                            onPress={() => onSelectMode(mode)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.modeContent}>
                                {/* Radio Button */}
                                <View style={[
                                    styles.radio,
                                    isSelected && styles.radioSelected,
                                ]}>
                                    {isSelected && <View style={styles.radioDot} />}
                                </View>

                                {/* Emoji */}
                                <Text style={styles.emoji}>{config.emoji}</Text>

                                {/* Labels */}
                                <View style={styles.labelContainer}>
                                    <Text style={[
                                        styles.label,
                                        isSelected && styles.labelSelected,
                                    ]}>
                                        {config.label}
                                    </Text>
                                    <Text style={styles.description}>{config.description}</Text>
                                    {availableCounts && (
                                        <Text style={styles.count}>{count} kart mevcut</Text>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.lg,
    },
    title: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.md,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    modesContainer: {
        gap: theme.spacing.sm,
    },
    modeOption: {
        backgroundColor: theme.colors.white,
        borderRadius: 12,
        padding: theme.spacing.md,
        borderWidth: 2,
        borderColor: theme.colors.gray[200],
    },
    modeOptionSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.background,
    },
    modeContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    radio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: theme.colors.gray[300],
        marginRight: theme.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: {
        borderColor: theme.colors.primary,
    },
    radioDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.primary,
    },
    emoji: {
        fontSize: 24,
        marginRight: theme.spacing.sm,
    },
    labelContainer: {
        flex: 1,
    },
    label: {
        fontFamily: theme.typography.fonts.bodyBold,
        fontSize: theme.typography.sizes.md,
        color: theme.colors.text,
        marginBottom: 2,
    },
    labelSelected: {
        color: theme.colors.primary,
    },
    description: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.gray[600],
        marginBottom: 2,
    },
    count: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.gray[500],
    },
});

export default ModeSelector;
