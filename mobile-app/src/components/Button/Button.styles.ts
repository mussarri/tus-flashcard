import { StyleSheet } from 'react-native';
import { theme } from '@theme/index';

export const styles = StyleSheet.create({
    container: {
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    primary: {
        backgroundColor: theme.colors.cta,
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    secondary: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.gray[300],
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    small: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        minHeight: 32,
    },
    large: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        minHeight: 56,
    },
    fullWidth: {
        width: '100%',
    },
    text: {
        fontFamily: theme.typography.fonts.subheading,
        fontSize: theme.typography.sizes.md,
        fontWeight: '600',
    },
    textPrimary: {
        color: theme.colors.white,
    },
    textSecondary: {
        color: theme.colors.primary,
    },
    textOutline: {
        color: theme.colors.gray[700],
    },
    textSmall: {
        fontSize: theme.typography.sizes.sm,
    },
    disabled: {
        opacity: 0.5,
    },
});
