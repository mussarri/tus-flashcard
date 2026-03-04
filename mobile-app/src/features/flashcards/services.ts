import api from "@services/api";
import {
  Flashcard,
  UserFlashcardProgress,
  CardType,
  StudyMode,
  PatternMastery,
  ReviewSubmission,
  SessionSummary,
  DashboardData,
  SessionStartRequest,
  SessionStartResponse,
  NextCardResponse,
  CardResponseRequest,
  CardResponseResult,
  BookmarkToggleResponse,
  MasteryData,
  HeatmapData,
} from "./types";

// ============================================
// LEGACY ENDPOINTS (Keep for backward compatibility)
// ============================================

// ============================================
// NEW BACKEND API SERVICE
// ============================================
const getUserId = (): string => {
  return "student-mock-id";
};

export const flashcardApiService = {
  // ========== Dashboard ==========

  /**
   * GET /api/student/flashcards/overview
   * Get dashboard with lesson-based card statistics
   */
  getDashboard: async (): Promise<DashboardData> => {
    const userId = getUserId();
    const response = await api.get(
      "/api/student/flashcards/overview?userId=" + userId,
    );
    console.log(response);

    return response.data;
  },

  // ========== Session Management ==========

  /**
   * POST /api/student/flashcards/session
   * Start a new flashcard session with specified criteria
   */
  startSession: async (
    request: SessionStartRequest,
  ): Promise<SessionStartResponse> => {
    const userId = getUserId();
    // Map mode to statuses
    let statuses: string[];
    switch (request.mode) {
      case "LEARN":
        statuses = ["UNSEEN"];
        break;
      case "WEAKNESS":
        statuses = ["HARD"];
        break;
      case "EASY":
        statuses = ["EASY"];
        break;
      case "SRS":
        statuses = ["MEDIUM"];
        break;
      default:
        statuses = ["EASY", "MEDIUM", "HARD"];
    }

    const response = await api.post("/api/student/flashcards/session", {
      lessonId: request.lessonId,
      topicId: request.topicId,
      statuses,
      limit: request.limit,
      userId,
    });
    return response.data;
  },

  /**
   * GET /api/student/flashcards/session/:sessionId/next
   * Get the next card in the current session
   */
  getNextCard: async (sessionId: string): Promise<NextCardResponse> => {
    const userId = getUserId();
    const response = await api.get(
      `/api/student/flashcards/session/${sessionId}/next?userId=` + userId,
    );
    return response.data;
  },

  // ========== Card Interaction ==========

  /**
   * POST /api/student/flashcards/:cardId/review
   * Submit user response to a flashcard (triggers SM-2 algorithm)
   */
  respondToCard: async (
    cardId: string,
    request: CardResponseRequest,
  ): Promise<CardResponseResult> => {
    const userId = getUserId();
    const response = await api.post(
      `/api/student/flashcards/${cardId}/review`,
      { ...request, userId },
    );
    return response.data;
  },

  /**
   * PATCH /api/student/flashcards/:cardId/favorite
   * Toggle favorite/starred status for a card
   */
  toggleBookmark: async (
    cardId: string,
    isFavorite: boolean,
  ): Promise<BookmarkToggleResponse> => {
    const userId = getUserId();
    const response = await api.patch(
      `/api/student/flashcards/${cardId}/favorite`,
      { userId, isFavorite },
    );
    return response.data;
  },

  // ========== Analytics ==========

  /**
   * GET /api/student/flashcards/mastery
   * Get mastery percentages by lesson
   */
  getMastery: async (): Promise<MasteryData> => {
    const userId = getUserId();
    const response = await api.get(
      "/api/student/flashcards/mastery?userId=" + userId,
    );
    return response.data;
  },

  /**
   * GET /api/student/flashcards/activity
   * Get 30-day activity heatmap (GitHub-style)
   */
  getHeatmap: async (): Promise<HeatmapData> => {
    const userId = getUserId();
    const response = await api.get(
      "/api/student/flashcards/activity?userId=" + userId,
    );
    return response.data;
  },

  /**
   * GET /api/student/flashcards/stats
   * Get overall flashcard statistics for user
   */
  getOverallStats: async () => {
    const userId = getUserId();
    const response = await api.get(
      "/api/student/flashcards/stats?userId=" + userId,
    );
    return response.data;
  },
};
