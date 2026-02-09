// ============================================
// CARD TYPE ENUMS
// ============================================

import { Lesson } from "@features/QuestionBank/types";

export enum CardType {
  // CORE CARDS (Tier 1: Foundational Knowledge)
  STRUCTURE_ID = 'STRUCTURE_ID',
  CONTENTS_OF_SPACE = 'CONTENTS_OF_SPACE',
  FUNCTIONAL_ANATOMY = 'FUNCTIONAL_ANATOMY',

  // INTERMEDIATE CARDS (Tier 2: Contextual Understanding)
  RELATIONS_BORDERS = 'RELATIONS_BORDERS',
  LESION_ANATOMY = 'LESION_ANATOMY',
  EMBRYOLOGIC_ORIGIN = 'EMBRYOLOGIC_ORIGIN',

  // ADVANCED CARDS (Tier 3: Exam-Specific & High-Yield)
  CLINICAL_CORRELATION = 'CLINICAL_CORRELATION',
  HIGH_YIELD_DISTINCTION = 'HIGH_YIELD_DISTINCTION',
  EXCEPT_TRAP = 'EXCEPT_TRAP',
  TOPOGRAPHIC_MAP = 'TOPOGRAPHIC_MAP',

  // LEGACY TYPES (Backward compatibility)
  SPOT = 'SPOT',
  CLINICAL_TIP = 'CLINICAL_TIP',
  COMPARISON = 'COMPARISON',
  TRAP = 'TRAP',
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum VisualStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  REQUIRED = 'REQUIRED',
  PENDING = 'PENDING',
  UPLOADED = 'UPLOADED',
  AVAILABLE = 'AVAILABLE',
}

// ============================================
// CARD TYPE TIERS
// ============================================

export const CORE_CARD_TYPES: CardType[] = [
  CardType.STRUCTURE_ID,
  CardType.CONTENTS_OF_SPACE,
  CardType.FUNCTIONAL_ANATOMY,
];

export const INTERMEDIATE_CARD_TYPES: CardType[] = [
  CardType.RELATIONS_BORDERS,
  CardType.LESION_ANATOMY,
  CardType.EMBRYOLOGIC_ORIGIN,
];

export const ADVANCED_CARD_TYPES: CardType[] = [
  CardType.CLINICAL_CORRELATION,
  CardType.HIGH_YIELD_DISTINCTION,
  CardType.EXCEPT_TRAP,
  CardType.TOPOGRAPHIC_MAP,
];

// ============================================
// TRAP DATA STRUCTURE
// ============================================

export interface TrapData {
  commonMistake: string;
  correctAnswer: string;
  distractors: string[];
}

// ============================================
// KNOWLEDGE POINT INTERFACE
// ============================================

export interface KnowledgePoint {
  id: string;
  fact: string;
  priority: number;
  examRelevance?: number;
  examPattern?: string;
  lesson?: {
    id: string;
    name: string;
    displayName: string;
  };
  topic?: {
    id: string;
    name: string;
    displayName: string;
  };
  subtopic?: {
    id: string;
    name: string;
    displayName: string;
  };
}

// ============================================
// FLASHCARD INTERFACE
// ============================================

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  cardType: CardType;

  // Hierarchy
  lessonId?: string;
  topicId?: string;
  subtopicId?: string;

  // Metadata
  difficulty: Difficulty;
  priority: number;

  // Visual requirements
  useVisual: boolean;
  visualRequirement?: string;
  visualContext?: string;
  highlightRegion?: string;
  imageAssetId?: string;
  visualStatus: VisualStatus;

  // Exam pattern tracking
  examPattern?: string;
  trapData?: TrapData;
  prerequisiteCardIds?: string[];

  // Knowledge Point relation
  knowledgePoint?: KnowledgePoint | null;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// USER PROGRESS
// ============================================

export interface UserFlashcardProgress {
  id: string;
  flashcardId: string;

  // SRS data
  easeFactor: number;
  interval: number;
  repetitions: number;
  lastReview?: string;
  nextReview: string;

  // Performance
  totalReviews: number;
  correctCount: number;
  incorrectCount: number;

  // Trap Pattern Tracking
  fellForTrap: boolean;
  trapLoopActive: boolean;
  trapLoopCount: number;
  lastResponse?: 'CORRECT' | 'INCORRECT' | 'FELL_FOR_TRAP';

  // Computed
  isDue?: boolean;
}

// ============================================
// PATTERN MASTERY
// ============================================

export interface PatternMastery {
  id: string;
  userId: string;
  examPattern: string;

  // Mastery Tracking
  masteryScore: number; // 0.0 to 1.0
  cardsTotal: number;
  cardsMastered: number;

  // Adaptive Backtracking
  needsBacktrack: boolean;
  prerequisitePatterns: string[];
  backtrackTriggeredAt?: string;

  createdAt: string;
  updatedAt: string;
}

// ============================================
// SESSION TYPES
// ============================================

export type StudyMode = 'learn' | 'review';

export interface FlashcardSessionParams {
  lessonId: string;
  mode: StudyMode;
  cardCount: number;
  cardTypes?: CardType[];
}

export interface SessionSummary {
  totalCards: number;
  correctCards: number;
  incorrectCards: number;
  timeSpent: number; // seconds
  cardsByType: Record<CardType, number>;
  masteryByTier: {
    core: number;
    intermediate: number;
    advanced: number;
  };
  weakPatterns: string[];
  recommendedBacktrack: string[];
}

// ============================================
// REVIEW RATING
// ============================================

export type ReviewRating = 1 | 2 | 3 | 4;

export interface ReviewSubmission {
  cardId: string;
  rating: ReviewRating;
  fellForTrap?: boolean;
  selectedDistractor?: string;
  timeSpent?: number;
}

// ============================================
// BACKEND API TYPES
// ============================================

// Dashboard Types
export interface LessonStats {
  due: number;
  learning: number;
  new: number;
  hard: number; // Cards marked as HARD (needs urgent review)
}

export interface DashboardData {
  overview: {
    [lessonName: string]: LessonStats;
  };
  lessons: Lesson[];
}

// Session Management Types
export type SessionMode = 'SRS' | 'LEARN' | 'WEAKNESS';

export interface SessionStartRequest {
  lessonId?: string;
  topicId?: string;
  mode: SessionMode;
  limit: number;
}

export interface SessionStartResponse {
  sessionId: string;
  totalCards: number;
  mode: SessionMode;
}

export interface SessionCard {
  id: string;
  cardId: string;
  front: string;
  back: string;
  cardType: CardType;
  imageAssetId?: string;
  visualStatus?: VisualStatus;
  knowledgePoint?: KnowledgePoint | null;
  metadata?: {
    difficulty: Difficulty;
    priority: number;
    examPattern?: string;
  };
  progress?: {
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReview: string;
  };
}

export interface NextCardResponse {
  card: SessionCard | null;
  position: number;
  total: number;
  sessionComplete: boolean;
}

// Response Types
export type ResponseType = 'HARD' | 'MEDIUM' | 'EASY';

export interface CardResponseRequest {
  response: ResponseType;
  sessionId?: string;
}

export interface CardResponseResult {
  success: boolean;
  nextReview: string;
  easeFactor: number;
  interval: number;
  message?: string;
}

// Bookmark Types
export interface BookmarkToggleResponse {
  cardId: string;
  isBookmarked: boolean;
}

// Analytics Types
export interface LessonMastery {
  lessonId: string;
  lessonName: string;
  masteryPercentage: number;
  totalCards: number;
  masteredCards: number;
  learningCards: number;
  newCards: number;
}

export interface MasteryData {
  overall: number;
  byLesson: LessonMastery[];
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // 0 = no activity, 4 = highest
}

export interface HeatmapData {
  days: HeatmapDay[];
  totalReviews: number;
  currentStreak: number;
  longestStreak: number;
}

