import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flashcardApiService } from '../services';
import {
    SessionStartRequest,
    CardResponseRequest,
} from '../types';

// ============================================
// QUERY KEYS
// ============================================

export const flashcardApiKeys = {
    all: ['flashcards-api'] as const,
    dashboard: () => [...flashcardApiKeys.all, 'dashboard'] as const,
    session: (sessionId: string) => [...flashcardApiKeys.all, 'session', sessionId] as const,
    nextCard: (sessionId: string) => [...flashcardApiKeys.session(sessionId), 'next'] as const,
    mastery: () => [...flashcardApiKeys.all, 'mastery'] as const,
    heatmap: () => [...flashcardApiKeys.all, 'heatmap'] as const,
};

// ============================================
// QUERIES
// ============================================

/**
 * Hook to fetch dashboard data
 * GET /student/flashcards/dashboard
 * 
 * Returns lesson-based statistics (due, learning, new cards)
 */
export const useDashboard = () => {
    return useQuery({
        queryKey: flashcardApiKeys.dashboard(),
        queryFn: flashcardApiService.getDashboard,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

/**
 * Hook to fetch next card in session
 * GET /student/sessions/:sessionId/next
 * 
 * Fetches the next card in the current session queue
 */
export const useNextCard = (sessionId: string | null, enabled = true) => {
    return useQuery({
        queryKey: flashcardApiKeys.nextCard(sessionId || ''),
        queryFn: () => flashcardApiService.getNextCard(sessionId!),
        enabled: enabled && !!sessionId,
        staleTime: 0, // Always fetch fresh card
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });
};

/**
 * Hook to fetch mastery analytics
 * GET /student/analytics/mastery
 * 
 * Returns overall and lesson-based mastery percentages
 */
export const useMastery = () => {
    return useQuery({
        queryKey: flashcardApiKeys.mastery(),
        queryFn: flashcardApiService.getMastery,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
};

/**
 * Hook to fetch heatmap data
 * GET /student/analytics/heatmap
 * 
 * Returns 30-day activity heatmap (GitHub-style)
 */
export const useHeatmap = () => {
    return useQuery({
        queryKey: flashcardApiKeys.heatmap(),
        queryFn: flashcardApiService.getHeatmap,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
};

// ============================================
// MUTATIONS
// ============================================

/**
 * Hook to start a new flashcard session
 * POST /student/sessions/start
 * 
 * Creates a session queue and returns sessionId
 */
export const useStartSession = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: SessionStartRequest) =>
            flashcardApiService.startSession(request),
        onSuccess: () => {
            // Invalidate dashboard after starting session
            queryClient.invalidateQueries({ queryKey: flashcardApiKeys.dashboard() });
        },
    });
};

/**
 * Hook to respond to a flashcard
 * POST /student/flashcards/:cardId/respond
 * 
 * Submits user response and triggers SM-2 algorithm
 */
export const useRespondToCard = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ cardId, request }: { cardId: string; request: CardResponseRequest }) =>
            flashcardApiService.respondToCard(cardId, request),
        onSuccess: (_, variables) => {
            // Invalidate next card query to fetch the next one
            if (variables.request.sessionId) {
                queryClient.invalidateQueries({
                    queryKey: flashcardApiKeys.nextCard(variables.request.sessionId),
                });
            }
            // Invalidate analytics
            queryClient.invalidateQueries({ queryKey: flashcardApiKeys.mastery() });
            queryClient.invalidateQueries({ queryKey: flashcardApiKeys.heatmap() });
            queryClient.invalidateQueries({ queryKey: flashcardApiKeys.dashboard() });
        },
    });
};

/**
 * Hook to toggle favorite on a flashcard
 * PATCH /student/flashcards/:cardId/favorite
 * 
 * Toggles the favorite/starred status
 */
export const useToggleBookmark = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ cardId, isFavorite }: { cardId: string; isFavorite: boolean }) =>
            flashcardApiService.toggleBookmark(cardId, isFavorite),
        onSuccess: (data, variables) => {
            // Optimistic update - could update cache directly if needed
            // For now, just invalidate to refetch
            queryClient.invalidateQueries({ queryKey: flashcardApiKeys.all });
        },
    });
};

