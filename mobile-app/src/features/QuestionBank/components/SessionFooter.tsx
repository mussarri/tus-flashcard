import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { theme } from '@theme/index';

interface SessionFooterProps {
    onNext: () => void;
    onSubmit: () => void;
    canSubmit: boolean;
    isSubmitted: boolean;
    isNextLoading?: boolean;
}

export const SessionFooter: React.FC<SessionFooterProps> = ({
    onNext,
    onSubmit,
    canSubmit,
    isSubmitted,
    isNextLoading = false,
}) => {
    return (
        <View style={styles.container}>
            {!isSubmitted ? (
                <TouchableOpacity
                    style={[styles.button, !canSubmit && styles.buttonDisabled]}
                    onPress={onSubmit}
                    disabled={!canSubmit}
                >
                    <Text style={styles.buttonText}>Submit Answer</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={[styles.button, styles.buttonNext]}
                    onPress={onNext}
                    disabled={isNextLoading}
                >
                    <Text style={styles.buttonText}>
                        {isNextLoading ? "Loading..." : "Next Question"}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: theme.spacing.md,
        backgroundColor: theme.colors.white,
        borderTopWidth: 1,
        borderTopColor: theme.colors.gray[200],
        ...theme.shadows.lg,
    },
    button: {
        backgroundColor: theme.colors.cta,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: {
        backgroundColor: theme.colors.gray[300],
    },
    buttonNext: {
        backgroundColor: theme.colors.primary,
    },
    buttonText: {
        color: theme.colors.white,
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.md,
    },
});
