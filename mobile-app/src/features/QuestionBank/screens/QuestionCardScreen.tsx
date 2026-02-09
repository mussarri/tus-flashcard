import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@theme/index';
import { QuestionStem } from '../components/QuestionStem';
import { OptionCard } from '../components/OptionCard';
import { ExplanationView } from '../components/ExplanationView';
import { SessionFooter } from '../components/SessionFooter';
import { QuestionCard, QuestionOptionId, AnswerResult } from '../types';
import { useSubmitAnswer } from '../queries';

interface QuestionCardScreenProps {
    question: QuestionCard;
    onNext: () => void;
}

// NOTE: This component is designed to be used optionally as a standalone screen or embedded.
// For the route handling, we will wrap it or fetch data inside.
// For now, I'll assume this fetches its own data or receives it via props if I was building a pure component.
// But following the plan, I should make this the Screen. 
// However, since I might not have the question data yet if navigating by ID, 
// I'll make a `QuestionCardContainer` that fetches, and this component just renders.
// For simplicity in this step, I'll build the Presentation part first.

export const QuestionCardUI: React.FC<{
    question: QuestionCard;
    onNext: () => void;
    onAnswerSubmitted?: (isCorrect: boolean, timeSpentMs: number) => void;
}> = ({ question, onNext, onAnswerSubmitted }) => {
    const [selectedOption, setSelectedOption] = useState<QuestionOptionId | null>(null);
    const [result, setResult] = useState<AnswerResult | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [startTime] = useState<number>(Date.now());

    const submitMutation = useSubmitAnswer();

    const handleSelect = (id: QuestionOptionId) => {
        if (!result) { // Only allow selection before submit
            setSelectedOption(id);
        }
    };

    const handleSubmit = async () => {
        if (!selectedOption || result) return; // Prevent double submission

        const timeSpentMs = Date.now() - startTime;
        setIsSubmitting(true);
        
        try {
            const data = await submitMutation.mutateAsync({
                questionId: question.id,
                payload: {
                    selectedOption,
                    durationMs: timeSpentMs,
                }
            });
            setResult(data);
            
            // Notify parent component for session tracking
            if (onAnswerSubmitted) {
                onAnswerSubmitted(data.isCorrect, timeSpentMs);
            }
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error ? error.message : "Failed to submit answer. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset state when question changes
    useEffect(() => {
        setSelectedOption(null);
        setResult(null);
        setIsSubmitting(false);
        // Note: startTime is reset via useState on mount/question change
    }, [question.id]);

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Question Stem */}
                <QuestionStem content={question.question} sourceType={question.sourceType} />

                {/* Options */}
                <View style={styles.optionsContainer}>
                    {(['A', 'B', 'C', 'D', 'E'] as QuestionOptionId[]).map((optId) => (
                        <OptionCard
                            key={optId}
                            id={optId}
                            text={question.options[optId]}
                            isSelected={selectedOption === optId}
                            isSubmitted={!!result}
                            isCorrect={result?.isCorrect} // user was correct? (Only true if this option was selected AND correct)
                            // Actually OptionCard logic for coloring:
                            // if submitted:
                            //   - if this option selected:
                            //       - if result.isCorrect -> GREEN
                            //       - else -> RED
                            //   - if this option is result.correctOption -> GREEN outline (if not selected)

                            // My OptionCard logic:
                            // isCorrect: used if selected.
                            // isCorrectOption: used if NOT selected but is the correct answer.

                            isCorrectOption={result?.correctOption === optId}
                            onSelect={handleSelect}
                        />
                    ))}
                </View>

                {/* Explanation (only after submit) */}
                {result && (
                    <View style={styles.explanationContainer}>
                        <ExplanationView result={result} />
                    </View>
                )}
            </ScrollView>

            {/* Footer */}
            <SessionFooter
                onNext={onNext}
                onSubmit={handleSubmit}
                canSubmit={!!selectedOption && !isSubmitting && !result}
                isSubmitted={!!result}
                isNextLoading={false} // Could be passed from parent
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    optionsContainer: {
        padding: theme.spacing.md,
    },
    explanationContainer: {
        marginTop: theme.spacing.md,
    },
});
