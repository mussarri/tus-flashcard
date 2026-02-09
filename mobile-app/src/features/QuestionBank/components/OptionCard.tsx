import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { theme } from '@theme/index';
import { QuestionOptionId } from '../types';
import { Ionicons } from '@expo/vector-icons';

interface OptionCardProps {
    id: QuestionOptionId;
    text: string;
    isSelected: boolean;
    isSubmitted: boolean;
    isCorrect?: boolean; // Only relevant if submitted
    isCorrectOption?: boolean; // If this option is the correct one (even if not selected)
    onSelect: (id: QuestionOptionId) => void;
}

export const OptionCard: React.FC<OptionCardProps> = ({
    id,
    text,
    isSelected,
    isSubmitted,
    isCorrect,
    isCorrectOption,
    onSelect,
}) => {
    const handlePress = () => {
        if (!isSubmitted) {
            onSelect(id);
        }
    };

    // Determine styles and icons based on state
    const containerStyles: any[] = [styles.container];
    const textStyles: any[] = [styles.text];
    const badgeStyles: any[] = [styles.badge];
    const badgeTextStyles: any[] = [styles.badgeText];

    let iconName: keyof typeof Ionicons.glyphMap | null = null;
    let iconColor: string = theme.colors.gray[400];

    if (isSubmitted) {
        if (isSelected) {
            if (isCorrect) {
                // Selected and Correct -> GREEN
                containerStyles.push(styles.correctContainer);
                textStyles.push(styles.correctText);
                badgeStyles.push(styles.correctBadge);
                badgeTextStyles.push(styles.correctText);
                iconName = 'checkmark-circle';
                iconColor = theme.colors.cta;
            } else {
                // Selected and WRONG -> RED
                containerStyles.push(styles.wrongContainer);
                textStyles.push(styles.wrongText);
                badgeStyles.push(styles.wrongBadge);
                badgeTextStyles.push(styles.wrongText);
                iconName = 'close-circle';
                iconColor = theme.colors.error;
            }
        } else if (isCorrectOption) {
            // Not selected, but IS the correct option -> Highlight GREEN outline
            containerStyles.push(styles.missedCorrectContainer);
            iconName = 'checkmark-circle-outline';
            iconColor = theme.colors.cta;
        } else {
            // Not selected, not correct -> Dimmed
            containerStyles.push({ opacity: 0.6 });
        }
    } else if (isSelected) {
        // Selected, not submitted -> PRIMARY UI
        containerStyles.push(styles.selectedContainer);
        badgeStyles.push(styles.selectedBadge);
        badgeTextStyles.push(styles.selectedBadgeText);
    }

    return (
        <TouchableOpacity
            style={containerStyles}
            onPress={handlePress}
            activeOpacity={0.7}
            disabled={isSubmitted}
        >
            <View style={styles.content}>
                <View style={badgeStyles}>
                    <Text style={badgeTextStyles}>{id}</Text>
                </View>
                <Text style={textStyles}>{text}</Text>
            </View>
            {iconName && (
                <Ionicons name={iconName} size={24} color={iconColor} />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.white,
        borderRadius: 8,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.gray[200],
        ...theme.shadows.sm,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    text: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.md,
        color: theme.colors.text,
        marginLeft: theme.spacing.md,
        flex: 1,
    },
    badge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.gray[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.gray[600],
    },
    // Selected State
    selectedContainer: {
        borderColor: theme.colors.primary,
        backgroundColor: '#E0F7FA', // Light cyan
    },
    selectedBadge: {
        backgroundColor: theme.colors.primary,
    },
    selectedBadgeText: {
        color: theme.colors.white,
    },
    // Correct State
    correctContainer: {
        borderColor: theme.colors.cta,
        backgroundColor: '#DCFCE7', // Light green
    },
    correctText: {
        color: '#14532D', // Dark green
    },
    correctBadge: {
        backgroundColor: theme.colors.cta,
    },
    // Wrong State
    wrongContainer: {
        borderColor: theme.colors.error,
        backgroundColor: '#FEE2E2', // Light red
    },
    wrongText: {
        color: '#7F1D1D', // Dark red
    },
    wrongBadge: {
        backgroundColor: theme.colors.error,
    },
    // Missed Correct (Correct option when user picked wrong)
    missedCorrectContainer: {
        borderColor: theme.colors.cta,
        backgroundColor: theme.colors.white,
        borderWidth: 2,
    }
});
