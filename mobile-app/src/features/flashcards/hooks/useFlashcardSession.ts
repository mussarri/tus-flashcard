import { useState, useCallback, useEffect } from 'react';
import { Flashcard, ReviewRating, ReviewSubmission } from '../types';
import { useSubmitReview } from './useFlashcardQueries';

interface UseFlashcardSessionProps {
    cards: Flashcard[];
    onSessionComplete: () => void;
}

interface SessionState {
    currentIndex: number;
    isFlipped: boolean;
    sessionStartTime: number;
    cardStartTime: number;
    reviews: ReviewSubmission[];
}

/**
 * Custom hook for managing flashcard session state and adaptive logic
 */
export const useFlashcardSession = ({
    cards,
    onSessionComplete,
}: UseFlashcardSessionProps) => {
    const [state, setState] = useState<SessionState>({
        currentIndex: 0,
        isFlipped: false,
        sessionStartTime: Date.now(),
        cardStartTime: Date.now(),
        reviews: [],
    });

    const submitReviewMutation = useSubmitReview();

    const currentCard = cards[state.currentIndex];
    const isLastCard = state.currentIndex === cards.length - 1;
    const progress = ((state.currentIndex + 1) / cards.length) * 100;

    /**
     * Flip the current card
     */
    const flipCard = useCallback(() => {
        setState(prev => ({ ...prev, isFlipped: !prev.isFlipped }));
    }, []);

    /**
     * Submit review for current card and move to next
     */
    const submitReview = useCallback(
        async (rating: ReviewRating, fellForTrap?: boolean, selectedDistractor?: string) => {
            if (!currentCard) return;

            const timeSpent = Math.floor((Date.now() - state.cardStartTime) / 1000);

            const submission: ReviewSubmission = {
                cardId: currentCard.id,
                rating,
                fellForTrap,
                selectedDistractor,
                timeSpent,
            };

            // Store review locally
            setState(prev => ({
                ...prev,
                reviews: [...prev.reviews, submission],
            }));

            // Submit to backend
            try {
                await submitReviewMutation.mutateAsync(submission);
            } catch (error) {
                console.error('Failed to submit review:', error);
            }

            // Move to next card or complete session
            if (isLastCard) {
                onSessionComplete();
            } else {
                setState(prev => ({
                    ...prev,
                    currentIndex: prev.currentIndex + 1,
                    isFlipped: false,
                    cardStartTime: Date.now(),
                }));
            }
        },
        [currentCard, state.cardStartTime, isLastCard, onSessionComplete, submitReviewMutation]
    );

    /**
     * Go to previous card (if not first)
     */
    const goToPrevious = useCallback(() => {
        if (state.currentIndex > 0) {
            setState(prev => ({
                ...prev,
                currentIndex: prev.currentIndex - 1,
                isFlipped: false,
                cardStartTime: Date.now(),
            }));
        }
    }, [state.currentIndex]);

    /**
     * Calculate session statistics
     */
    const getSessionStats = useCallback(() => {
        const totalTime = Math.floor((Date.now() - state.sessionStartTime) / 1000);
        const correctReviews = state.reviews.filter(r => r.rating >= 3).length;
        const incorrectReviews = state.reviews.filter(r => r.rating < 3).length;

        return {
            totalCards: cards.length,
            reviewedCards: state.reviews.length,
            correctCards: correctReviews,
            incorrectCards: incorrectReviews,
            totalTime,
            averageTimePerCard: state.reviews.length > 0
                ? totalTime / state.reviews.length
                : 0,
        };
    }, [cards.length, state.reviews, state.sessionStartTime]);

    return {
        currentCard,
        currentIndex: state.currentIndex,
        isFlipped: state.isFlipped,
        progress,
        isLastCard,
        flipCard,
        submitReview,
        goToPrevious,
        getSessionStats,
        canGoBack: state.currentIndex > 0,
    };
};
