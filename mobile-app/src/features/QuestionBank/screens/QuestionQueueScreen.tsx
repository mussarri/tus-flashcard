import React, { useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useQuestionQueue } from '../queries';
import { QuestionCardUI } from './QuestionCardScreen';
import { theme } from '@theme/index';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { QuestionFilter, SourceType } from '../types';

export const QuestionQueueScreen: React.FC = () => {
    const router = useRouter();
    const params = useLocalSearchParams<{
        sourceType: SourceType;
        lessonId: string;
        topicId?: string;
    }>();

    const filters: QuestionFilter = {
        limit: 20,
        sourceType: params.sourceType,
        lessonId: params.lessonId,
        topicId: params.topicId,
    };

    const { data: questions, isLoading, isError, refetch } = useQuestionQueue(filters);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [totalTimeMs, setTotalTimeMs] = useState(0);

    const handleAnswerSubmitted = (isCorrect: boolean, timeSpentMs: number) => {
        if (isCorrect) {
            setCorrectCount(prev => prev + 1);
        }
        setTotalTimeMs(prev => prev + timeSpentMs);
    };

    const handleNext = () => {
        if (questions && currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Session finished - navigate with stats
            const totalQuestions = questions?.length || 0;
            router.push({
                pathname: '/(question-bank)/summary',
                params: {
                    totalQuestions: totalQuestions.toString(),
                    correctCount: correctCount.toString(),
                    timeSpentMs: totalTimeMs.toString(),
                }
            });
        }
    };

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading questions...</Text>
            </View>
        );
    }

    if (isError || !questions || questions.length === 0) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Failed to load questions.</Text>
                <Text onPress={() => refetch()} style={styles.retryText}>Tap to retry</Text>
            </View>
        );
    }

    const currentQuestion = questions[currentIndex];
    const progress = questions ? `${currentIndex + 1} / ${questions.length}` : '';

    return (
        <View style={styles.container}>
            {/* Progress Indicator */}
            {progress && (
                <View style={styles.progressBar}>
                    <Text style={styles.progressText}>{progress}</Text>
                </View>
            )}

            <QuestionCardUI
                question={currentQuestion}
                onNext={handleNext}
                onAnswerSubmitted={handleAnswerSubmitted}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
    },
    loadingText: {
        marginTop: theme.spacing.md,
        fontFamily: theme.typography.fonts.body,
        color: theme.colors.gray[600],
    },
    errorText: {
        fontFamily: theme.typography.fonts.body,
        color: theme.colors.error,
    },
    retryText: {
        marginTop: theme.spacing.md,
        fontFamily: theme.typography.fonts.heading,
        color: theme.colors.primary,
    },
    progressBar: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    progressText: {
        fontFamily: theme.typography.fonts.heading,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.white,
    },
});
