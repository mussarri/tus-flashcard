import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flashcardService } from '../services';
import {
    CardType,
    StudyMode,
    ReviewSubmission,
    FlashcardSessionParams,
} from '../types';

// Query keys
export const flashcardKeys = {
    all: ['flashcards'] as const,
    due: () => [...flashcardKeys.all, 'due'] as const,
    byType: (params: Partial<FlashcardSessionParams>) =>
        [...flashcardKeys.all, 'by-type', params] as const,
    patternMastery: () => [...flashcardKeys.all, 'pattern-mastery'] as const,
    stats: () => [...flashcardKeys.all, 'stats'] as const,
    session: (sessionId: string) => [...flashcardKeys.all, 'session', sessionId] as const,
};

/**
 * Hook to fetch due cards for review
 */
export const useDueCards = () => {
    return useQuery({
        queryKey: flashcardKeys.due(),
        queryFn: flashcardService.getDueCards,
    });
};

/**
 * Hook to fetch cards by type for a study session
 */
export const useCardsByType = (params: {
    lessonId: string;
    cardTypes?: CardType[];
    limit?: number;
    mode: StudyMode;
}, enabled = true) => {
    return useQuery({
        queryKey: flashcardKeys.byType(params),
        queryFn: () => flashcardService.getCardsByType(params),
        enabled,
    });
};

/**
 * Hook to fetch pattern mastery data
 */
export const usePatternMastery = () => {
    return useQuery({
        queryKey: flashcardKeys.patternMastery(),
        queryFn: flashcardService.getPatternMastery,
    });
};

/**
 * Hook to fetch deck statistics
 */
export const useDeckStats = () => {
    return useQuery({
        queryKey: flashcardKeys.stats(),
        queryFn: flashcardService.getDeckStats,
    });
};

/**
 * Hook to submit card review
 */
export const useSubmitReview = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (submission: ReviewSubmission) =>
            flashcardService.submitReview(submission),
        onSuccess: () => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: flashcardKeys.due() });
            queryClient.invalidateQueries({ queryKey: flashcardKeys.patternMastery() });
            queryClient.invalidateQueries({ queryKey: flashcardKeys.stats() });
        },
    });
};

/**
 * Hook to start a new flashcard session
 */
export const useStartSession = () => {
    return useMutation({
        mutationFn: (params: FlashcardSessionParams) =>
            flashcardService.startSession(params),
    });
};

/**
 * Hook to get session summary
 */
export const useSessionSummary = (sessionId: string, enabled = true) => {
    return useQuery({
        queryKey: flashcardKeys.session(sessionId),
        queryFn: () => flashcardService.getSessionSummary(sessionId),
        enabled,
    });
};
