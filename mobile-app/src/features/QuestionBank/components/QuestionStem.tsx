import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { theme } from '@theme/index';

interface QuestionStemProps {
    content: string;
    sourceType?: 'ADMIN' | 'EXAM_REPLICA' | 'AI_GENERATION' | 'ERROR_BASED';
}

export const QuestionStem: React.FC<QuestionStemProps> = ({ content, sourceType }) => {
    return (
        <View style={styles.container}>
            {sourceType === 'EXAM_REPLICA' && (
                <View style={styles.replicaBadge}>
                    <Text style={styles.replicaBadgeText}>🟡 Çıkmış Soru (TUS)</Text>
                </View>
            )}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
            >
                <Text style={styles.text}>{content}</Text>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1, // Allow stem to take available space, but not push everything off
        maxHeight: '40%', // Cap height so options are visible
        backgroundColor: theme.colors.white,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray[200],
    },
    replicaBadge: {
        backgroundColor: '#FEF3C7', // Amber-100
        borderBottomWidth: 1,
        borderBottomColor: '#F59E0B', // Amber-500
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    replicaBadgeText: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.sm,
        fontWeight: '600',
        color: '#92400E', // Amber-900
    },
    scrollContent: {
        padding: theme.spacing.md,
    },
    text: {
        fontFamily: theme.typography.fonts.body,
        fontSize: theme.typography.sizes.lg, // Larger text for readability
        color: theme.colors.text,
        lineHeight: 28,
    },
});
