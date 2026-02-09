import { SessionMode } from '../types';

/**
 * Flashcard Color Definitions
 * Based on UX design specifications
 */
export const FLASHCARD_COLORS = {
    NEW: '#9C27B0',      // Purple - New cards (LEARN mode)
    REVIEW: '#F44336',   // Red - Review/Hard cards (WEAKNESS mode)
    SRS: '#4CAF50',      // Green - SRS mode
    LEARNING: '#FFC107', // Yellow - Learning cards
} as const;

/**
 * Mode configuration for UI display
 * Maps SessionMode to visual properties
 */
export const MODE_CONFIG: Record<SessionMode, {
    emoji: string;
    label: string;
    description: string;
    color: string;
}> = {
    LEARN: {
        emoji: '🟢',
        label: 'Yeni Kartlar',
        description: 'Hiç görmediğin kartları öğren',
        color: FLASHCARD_COLORS.NEW,
    },
    WEAKNESS: {
        emoji: '🔴',
        label: 'Zorlanılanlar',
        description: 'Zor gelen kartları tekrar et',
        color: FLASHCARD_COLORS.REVIEW,
    },
    SRS: {
        emoji: '🟡',
        label: 'Akıllı Tekrar',
        description: 'Aralıklı tekrar algoritması',
        color: FLASHCARD_COLORS.SRS,
    },
};

/**
 * Response button configuration
 */
export const RESPONSE_CONFIG = {
    HARD: {
        emoji: '🔴',
        label: 'Zor',
        sublabel: 'Tekrar göster',
        color: '#F44336',
    },
    MEDIUM: {
        emoji: '🟡',
        label: 'Orta',
        sublabel: 'Ara sıra tekrar',
        color: '#FFC107',
    },
    EASY: {
        emoji: '🟢',
        label: 'Kolay',
        sublabel: 'Öğrendim',
        color: '#4CAF50',
    },
} as const;
