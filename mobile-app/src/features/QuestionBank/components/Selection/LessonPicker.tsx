import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@theme/index';
import { Lesson } from '../../types';

interface LessonPickerProps {
    lessons: Lesson[];
    selectedLessonId: string | null;
    onSelect: (lessonId: string) => void;
    isLoading?: boolean;
}

export const LessonPicker: React.FC<LessonPickerProps> = ({
    lessons,
    selectedLessonId,
    onSelect,
    isLoading,
}) => {
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading lessons...</Text>
            </View>
        );
    }

    const basicLessons = lessons.filter(l => l.category === 'BASIC');
    const clinicalLessons = lessons.filter(l => l.category === 'CLINICAL');

    const renderLesson = (lesson: Lesson) => {
        const isSelected = selectedLessonId === lesson.id;
        return (
            <TouchableOpacity
                key={lesson.id}
                style={[styles.lessonItem, isSelected && styles.selectedItem]}
                onPress={() => onSelect(lesson.id)}
            >
                <Ionicons
                    name={lesson.icon as any || 'book-outline'}
                    size={20}
                    color={isSelected ? theme.colors.white : theme.colors.gray[600]}
                />
                <Text style={[styles.lessonText, isSelected && styles.selectedText]}>
                    {lesson.name}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Basic Sciences</Text>
            <View style={styles.grid}>
                {basicLessons.map(renderLesson)}
            </View>

            <Text style={styles.sectionTitle}>Clinical Sciences</Text>
            <View style={styles.grid}>
                {clinicalLessons.map(renderLesson)}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    loadingText: {
        fontFamily: theme.typography.fonts.body,
        color: theme.colors.gray[500],
    },
    sectionTitle: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.gray[500],
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    lessonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.gray[200],
        marginBottom: theme.spacing.xs,
        minWidth: '45%',
    },
    selectedItem: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    lessonText: {
        fontFamily: theme.typography.fonts.subheading,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.text,
        marginLeft: theme.spacing.sm,
    },
    selectedText: {
        color: theme.colors.white,
    },
});
