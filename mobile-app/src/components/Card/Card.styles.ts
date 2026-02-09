import { StyleSheet } from 'react-native';
import { theme } from '@theme/index';

export const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.background,
        borderRadius: 12,
        padding: theme.spacing.lg,
        // Shadow Mixin
        shadowColor: theme.shadows.md.shadowColor,
        shadowOffset: theme.shadows.md.shadowOffset,
        shadowOpacity: theme.shadows.md.shadowOpacity,
        shadowRadius: theme.shadows.md.shadowRadius,
        elevation: theme.shadows.md.elevation,
    },
});
