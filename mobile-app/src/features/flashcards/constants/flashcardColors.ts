import { SessionMode } from '../types';

/**
 * Flashcard Color Definitions
 * Based on UX design specifications
 */
export const FLASHCARD_COLORS = {
    NEW: '#9C27B0',
    HARD: '#F44336',
    MEDIUM: '#FFC107',
    EASY: '#2E7D32',
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
    NEW: {
        emoji: '🟢',
        label: 'Yeni Kartlar',
        description: 'Hiç görmediğin kartları öğren',
        color: FLASHCARD_COLORS.NEW,
    },
    HARD: {
        emoji: '🔴',
        label: 'Zorlanılanlar',
        description: 'Zor gelen kartları tekrar et',
        color: FLASHCARD_COLORS.HARD,
    },
    MEDIUM: {
        emoji: '🟡',
        label: 'Orta Seviye',
        description: 'Orta zorluktaki kartları tekrar et',
        color: FLASHCARD_COLORS.MEDIUM,
    },
    EASY: {
        emoji: '✅',
        label: 'Kolay Kartlar',
        description: 'Öğrendiğin kartları hızlı tekrar et',
        color: FLASHCARD_COLORS.EASY,
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
