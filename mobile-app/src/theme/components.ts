import { StyleSheet } from 'react-native';
import { theme } from './index';

export const commonStyles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.background,
        borderRadius: 12,
        padding: theme.spacing.lg,
        ...theme.shadows.md,
    },
    buttonPrimary: {
        backgroundColor: theme.colors.cta,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
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
    },
    inputFocus: {
        borderColor: theme.colors.primary,
    },
});
