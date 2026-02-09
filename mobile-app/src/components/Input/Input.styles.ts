import { StyleSheet } from 'react-native';
import { theme } from '@theme/index';

export const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.md,
    },
    label: {
        fontFamily: theme.typography.fonts.subheading,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    input: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: theme.colors.gray[200],
        borderRadius: 8,
        fontSize: theme.typography.sizes.md,
        fontFamily: theme.typography.fonts.body,
        backgroundColor: theme.colors.white,
        color: theme.colors.text,
    },
    inputFocus: {
        borderColor: theme.colors.primary,
        // Optional: Add subtle shadow on focus
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    inputError: {
        borderColor: theme.colors.error,
    },
    errorText: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.error,
        marginTop: theme.spacing.xs,
    },
});
