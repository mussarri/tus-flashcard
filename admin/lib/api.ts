/* eslint-disable @typescript-eslint/no-explicit-any */
// Client-side requests go through Next.js proxy (relative URL)
const API_BASE = "/tus-admin/api/proxy";
// Server-side requests go directly to backend
const BACKEND_URL =
  process.env.BACKEND_URL || process.env.API_URL || "http://api:5000";

// Server-side GET requests - direct to backend (no proxy)
export async function serverFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const baseUrl = BACKEND_URL.replace(/\/$/, "");
  const fullPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${fullPath}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    cache: "no-store", // Default: no cache, can be overridden with options
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Client-side requests - through proxy
export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  // Don't set Content-Type for FormData - browser will set it with boundary
  const isFormData = options?.body instanceof FormData;
  const headers: HeadersInit = isFormData
    ? { ...options?.headers }
    : {
        "Content-Type": "application/json",
        ...options?.headers,
      };

  const response = await fetch(`${API_BASE}/${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    console.log("error", error);
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Upload
  createBatch: (data: {
    topic: string;
    description?: string;
    contentTypeHint?: string;
    visionProvider?: string;
  }) =>
    apiRequest<{ success: boolean; batch: any }>("api/upload/batch", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  uploadFiles: async (batchId: string, formData: FormData) => {
    const response = await fetch(
      `${API_BASE}/api/upload/batch/${batchId}/files`,
      {
        method: "POST",
        body: formData,
      },
    );
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  },

  addPagesToBatch: async (batchId: string, formData: FormData) => {
    const response = await fetch(
      `${API_BASE}/api/upload/batch/${batchId}/pages`,
      {
        method: "POST",
        body: formData,
      },
    );
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  },

  getBatch: (batchId: string) =>
    apiRequest<{ success: boolean; batch: any }>(`api/upload/batch/${batchId}`),

  getAllBatches: () =>
    apiRequest<{ success: boolean; batches: any[] }>("api/upload/batches"),

  deleteBatch: (batchId: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `api/upload/batch/${batchId}`,
      {
        method: "DELETE",
      },
    ),
  updateBatch: (
    batchId: string,
    data: { topic?: string; description?: string },
  ) =>
    apiRequest<{ success: boolean; batch: any }>(
      `api/upload/batch/${batchId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    ),

  // Parsing
  classifyBatch: (batchId: string) =>
    apiRequest<{ success: boolean }>(`api/parsing/batch/${batchId}/classify`, {
      method: "POST",
    }),

  // Approval
  approveBlock: (blockId: string, data?: { editedText?: string }) =>
    apiRequest<{ success: boolean; approvedContent: any }>(
      `api/approval/block/${blockId}/approve`,
      {
        method: "POST",
        body: JSON.stringify(data || {}),
      },
    ),
  // Admin - Topics
  getTopics: (filters?: {
    lessonId?: string;
    topicId?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.lessonId) params.append("lessonId", filters.lessonId);
    if (filters?.topicId) params.append("topicId", filters.topicId);
    if (filters?.search) params.append("search", filters.search);
    const query = params.toString();
    return apiRequest<{
      success: boolean;
      lessons: Array<{
        id: string;
        name: string;
        displayName: string;
        questionCount: number;
      }>;

      topics: Array<{
        id: string;
        name: string;
        displayName: string;
        lessonId: string;
        questionCount: number;
      }>;

      subtopics: Array<{
        id: string;
        name: string;
        displayName: string;
        topicId: string;
        questionCount: number;
      }>;
    }>(`admin/topics${query ? `?${query}` : ""}`);
  },

  generateFlashcardsForTopic: (
    topicId: string,
    data: { mode?: "append" | "replace"; provider?: "OPENAI" | "GEMINI" },
  ) =>
    apiRequest<{
      success: boolean;
      topic: string;
      mode: string;
      provider: string;
      queued: number;
      skipped: number;
      deleted: number;
      coverage?: {
        total: number;
        used: number;
        skipped: number;
        reasons: Record<string, number>;
      };
    }>(`admin/topics/${topicId}/generate-flashcards`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  generateQuestionsForTopic: (
    topicId: string,
    data: { mode?: "append" | "replace"; provider?: "OPENAI" | "GEMINI" },
  ) =>
    apiRequest<{
      success: boolean;
      topic: string;
      mode: string;
      provider: string;
      queued: number;
      skipped: number;
      deleted: number;
    }>(`admin/topics/${topicId}/generate-questions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  mergeTopics: (data: {
    lessonId: string;
    sourceTopicId: string;
    targetTopicId: string;
  }) =>
    apiRequest<{
      success: boolean;
      lessonId: string;
      sourceTopicId: string;
      targetTopicId: string;
    }>("admin/topics/merge", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  mergeSubtopics: (data: {
    lessonId: string;
    topicId: string;
    sourceSubtopicId: string;
    targetSubtopicId: string;
  }) =>
    apiRequest<{
      success: boolean;
      lessonId: string;
      topicId: string;
      sourceSubtopicId: string;
      targetSubtopicId: string;
    }>("admin/subtopics/merge", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  rejectBlock: (blockId: string) =>
    apiRequest<{ success: boolean }>(`api/approval/block/${blockId}/reject`, {
      method: "POST",
    }),

  deleteBlock: (blockId: string) =>
    apiRequest<{ success: boolean }>(`api/approval/block/${blockId}/delete`, {
      method: "POST",
    }),

  createManualBlock: (
    pageId: string,
    data: {
      rawText: string;
      contentType: string;
      lesson?: string;
      topic?: string;
      subtopic?: string;
    },
  ) =>
    apiRequest<{ success: boolean; block: any }>(
      `api/approval/page/${pageId}/manual-block`,
      {
        method: "POST",
        body: JSON.stringify({ ...data, pageId }),
      },
    ),

  getBatchForReview: (batchId: string) =>
    apiRequest<{ success: boolean; batch: any }>(
      `api/approval/batch/${batchId}/review`,
    ),

  getApprovedBlocks: (batchId: string) =>
    apiRequest<{ success: boolean; approvedBlocks: any[] }>(
      `api/approval/batch/${batchId}/approved`,
    ),

  // Vision
  analyzeImage: async (formData: FormData) => {
    const response = await fetch(`${API_BASE}/admin/vision/analyze-image`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  },

  analyzePDF: async (formData: FormData) => {
    const response = await fetch(`${API_BASE}/admin/vision/analyze-pdf`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  },

  // AI Usage Analytics
  getAIUsageSummary: () =>
    apiRequest<{ success: boolean; data: any }>("admin/ai-usage/summary"),

  getAIUsageByTask: () =>
    apiRequest<{ success: boolean; data: any[] }>("admin/ai-usage/by-task"),

  getAIUsageByModel: () =>
    apiRequest<{ success: boolean; data: any[] }>("admin/ai-usage/by-model"),

  getAIUsageByDay: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    const query = params.toString();
    return apiRequest<{ success: boolean; data: any[] }>(
      `admin/ai-usage/by-day${query ? `?${query}` : ""}`,
    );
  },

  getAIUsageByTopic: (topicId: string) =>
    apiRequest<{ success: boolean; data: any }>(
      `admin/ai-usage/by-topic/${topicId}`,
    ),

  getAIUsageByBatch: (batchId: string) =>
    apiRequest<{ success: boolean; data: any }>(
      `admin/ai-usage/by-batch/${batchId}`,
    ),

  // Manual Content
  createManualContent: (data: {
    topicId: string;
    description?: string;
    contentType: string;
    textContent: string;
  }) =>
    apiRequest<{
      success: boolean;
      batchId: string;
      pageId: string;
      blockId: string;
    }>("admin/manual-content", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Knowledge Extraction
  extractKnowledgeForContent: (approvedContentId: string) =>
    apiRequest<{
      success: boolean;
      approvedContentId: string;
      queued: boolean;
      jobId?: string;
    }>(`admin/approved-contents/${approvedContentId}/extract-knowledge`, {
      method: "POST",
    }),

  // List approved contents (with optional query string)
  getApprovedContents: (queryString: string = "") =>
    apiRequest<{ success: boolean; approvedContents: any[] }>(
      `admin/approved-contents${queryString ? `?${queryString}` : ""}`,
    ),

  // Get all knowledge points with pagination and filters
  getKnowledgePoints: (queryString: string = "") =>
    apiRequest<{
      success: boolean;
      data: any;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>(`admin/knowledge-points${queryString ? `?${queryString}` : ""}`),

  extractKnowledgeForBatch: (batchId: string) =>
    apiRequest<{
      success: boolean;
      batchId: string;
      queued: number;
      skipped: number;
    }>(`admin/batches/${batchId}/extract-knowledge`, {
      method: "POST",
    }),

  // Knowledge Points
  getKnowledgePointsForBatch: (batchId: string) =>
    apiRequest<{ success: boolean; batchId: string; knowledgePoints: any[] }>(
      `admin/batches/${batchId}/knowledge-points`,
    ),

  getKnowledgePointsForContent: (approvedContentId: string) =>
    apiRequest<{
      success: boolean;
      approvedContentId: string;
      knowledgePoints: any[];
    }>(`admin/approved-contents/${approvedContentId}/knowledge-points`),

  // Generate flashcards for selected knowledge points
  generateFlashcardsForKnowledgePoints: (knowledgePointIds: string[]) =>
    apiRequest<{
      success: boolean;
      queued: number;
      skipped: number;
      deleted: number;
      errors: Array<{ id: string; error: string }>;
    }>("admin/knowledge-points/batch-generate-flashcards", {
      method: "POST",
      body: JSON.stringify({ knowledgePointIds }),
    }),

  // Flashcards
  getFlashcardsForBatch: (batchId: string) =>
    apiRequest<{ success: boolean; batchId: string; flashcards: any[] }>(
      `admin/batches/${batchId}/flashcards`,
    ),

  getFlashcardsForTopic: (topicId: string) =>
    apiRequest<{ success: boolean; topic: string; flashcards: any[] }>(
      `admin/topics/${topicId}/flashcards`,
    ),

  // Flashcard Visual
  getFlashcardsWithVisual: (queryString: string) =>
    apiRequest<any>(`admin/flashcards${queryString ? `?${queryString}` : ""}`),

  getFlashcardDetail: (id: string) =>
    apiRequest<{ success: boolean; flashcard: any }>(`admin/flashcards/${id}`),

  uploadFlashcardVisual: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE}/admin/flashcards/${id}/visual`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  },

  bindFlashcardVisual: (
    id: string,
    data: { imageAssetId: string; highlightRegion?: string },
  ) =>
    apiRequest<{ success: boolean; flashcard: any }>(
      `admin/flashcards/${id}/visual/bind`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  getImageAssets: (params?: { search?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.limit) query.set("limit", params.limit.toString());
    return apiRequest<{
      success: boolean;
      assets: Array<{
        id: string;
        fileName: string;
        filePath: string;
        mimeType: string;
        createdAt: string;
        _count: { flashcards: number };
      }>;
    }>(`admin/image-assets?${query.toString()}`);
  },

  publishFlashcard: (id: string) =>
    apiRequest<{ success: boolean; flashcard: any }>(
      `admin/flashcards/${id}/publish`,
      {
        method: "POST",
      },
    ),

  updateFlashcard: (
    id: string,
    data: {
      front?: string;
      back?: string;
      cardType?: string;
      useVisual?: boolean;
      visualRequirement?: string;
      visualContext?: string;
      highlightRegion?: string;
      visualStatus?: string;
    },
  ) =>
    apiRequest<{ success: boolean; flashcard: any }>(`admin/flashcards/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteFlashcard: (id: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `admin/flashcards/${id}`,
      {
        method: "DELETE",
      },
    ),

  getFlashcardStats: () =>
    apiRequest<{
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      requiresVisual: number;
      visualUploaded: number;
      byCardType: Array<{ cardType: string; _count: number }>;
    }>("flashcards/admin/stats"),

  bulkPublishFlashcards: (ids: string[]) =>
    apiRequest<{
      success: boolean;
      successful: string[];
      failed: Array<{ id: string; reason: string }>;
    }>("admin/flashcards/bulk-publish", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  // Generated Questions
  listGeneratedQuestions: (filters?: {
    status?: string;
    lessonId?: string;
    topicId?: string;
    subtopicId?: string;
    prerequisiteId?: string;
    sourceType?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.lessonId) params.append("lessonId", filters.lessonId);
    if (filters?.topicId) params.append("topicId", filters.topicId);
    if (filters?.subtopicId) params.append("subtopicId", filters.subtopicId);
    if (filters?.prerequisiteId)
      params.append("prerequisiteId", filters.prerequisiteId);
    if (filters?.sourceType) params.append("sourceType", filters.sourceType);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.sortBy) params.append("sortBy", filters.sortBy);
    if (filters?.sortOrder) params.append("sortOrder", filters.sortOrder);
    const query = params.toString();
    return apiRequest<{
      success: boolean;
      questions: any[];
      total: number;
      statusCounts: Record<string, number>;
    }>(`admin/generated-questions${query ? `?${query}` : ""}`);
  },

  getGeneratedQuestion: (id: string) =>
    apiRequest<{ success: boolean; question: any }>(
      `admin/generated-questions/${id}`,
    ),

  approveGeneratedQuestion: (id: string, approvedBy: string = "admin") =>
    apiRequest<{ success: boolean; message: string; question: any }>(
      `admin/generated-questions/${id}/approve`,
      {
        method: "POST",
        body: JSON.stringify({ approvedBy }),
      },
    ),

  rejectGeneratedQuestion: (
    id: string,
    rejectedBy: string = "admin",
    reason?: string,
  ) =>
    apiRequest<{ success: boolean; message: string; question: any }>(
      `admin/generated-questions/${id}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ rejectedBy, reason }),
      },
    ),

  editGeneratedQuestion: (
    id: string,
    data: {
      question?: string;
      options?: Record<string, string>;
      correctAnswer?: string;
      explanation?: string;
      editedBy?: string;
    },
  ) =>
    apiRequest<{ success: boolean; message: string; question: any }>(
      `admin/generated-questions/${id}/edit`,
      {
        method: "POST",
        body: JSON.stringify({ ...data, editedBy: data.editedBy || "admin" }),
      },
    ),

  deleteGeneratedQuestion: (id: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `admin/generated-questions/${id}`,
      {
        method: "DELETE",
      },
    ),

  // Questions
  getQuestionsForBatch: (batchId: string) =>
    apiRequest<{ success: boolean; batchId: string; questions: any[] }>(
      `admin/batches/${batchId}/questions`,
    ),

  getQuestionsForTopic: (topicId: string) =>
    apiRequest<{ success: boolean; topic: string; questions: any[] }>(
      `admin/topics/${topicId}/questions`,
    ),

  // Knowledge Review
  getKnowledgePointsForReview: (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
    filterByLesson?: string;
    filterByPattern?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);
    if (params?.filterByLesson) queryParams.append("filterByLesson", params.filterByLesson);
    if (params?.filterByPattern) queryParams.append("filterByPattern", params.filterByPattern);
    
    const query = queryParams.toString();
    return apiRequest<{ 
      success: boolean; 
      data: any[];
      pagination: {
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>(
      `admin/knowledge/review${query ? `?${query}` : ""}`,
    );
  },

  bulkApproveKnowledgePoints: (ids: string[]) =>
    apiRequest<{ success: boolean; successful: number }>(
      "admin/knowledge/bulk-approve",
      {
        method: "POST",
        body: JSON.stringify({ ids }),
      },
    ),

  bulkRejectKnowledgePoints: (ids: string[], reason: string) =>
    apiRequest<{ success: boolean; successful: number }>(
      "admin/knowledge/bulk-reject",
      {
        method: "POST",
        body: JSON.stringify({ ids, reason }),
      },
    ),

  approveKnowledgePoint: (knowledgePointId: string) =>
    apiRequest<{ success: boolean; knowledgePoint: any }>(
      `admin/knowledge/${knowledgePointId}/approve`,
      {
        method: "POST",
      },
    ),

  mergeKnowledgePoints: (sourceId: string, targetId: string) =>
    apiRequest<{ success: boolean; mergedKnowledgePoint: any }>(
      `admin/knowledge/${sourceId}/merge/${targetId}`,
      {
        method: "POST",
      },
    ),

  rejectKnowledgePoint: (knowledgePointId: string, reason: string) =>
    apiRequest<{ success: boolean }>(
      `admin/knowledge/${knowledgePointId}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    ),

  // Dashboard KPI
  getMissingVisualsKPI: () =>
    apiRequest<{
      success: boolean;
      total: number;
      byLesson: Record<string, number>;
      byVisualRequirement: {
        IMAGE_OCCLUSION: number;
        SCHEMATIC: number;
      };
      aging: {
        over7Days: number;
        over14Days: number;
      };
    }>("admin/dashboard/kpi/missing-visuals"),

  // Exam Questions
  createExamQuestion: (data: {
    year: number;
    examType?: string;
    questionNumber?: number;
    question: string;
    options: Record<string, string>;
    correctAnswer: string;
    explanation?: string;
  }) =>
    apiRequest<{ success: boolean; examQuestion: any }>(
      "admin/exam-questions",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  getExamQuestions: (query?: {
    year?: number;
    examType?: string;
    lesson?: string;
    topic?: string;
    analysisStatus?: string;
    hasKnowledgePoints?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
  }) => {
    const params = new URLSearchParams();
    if (query?.year) params.append("year", query.year.toString());
    if (query?.examType) params.append("examType", query.examType);
    if (query?.lesson) params.append("lessonId", query.lesson);
    if (query?.topic) params.append("topicId", query.topic);
    if (query?.analysisStatus)
      params.append("analysisStatus", query.analysisStatus);
    if (query?.hasKnowledgePoints)
      params.append("hasKnowledgePoints", query.hasKnowledgePoints);
    if (query?.page) params.append("page", query.page.toString());
    if (query?.limit) params.append("limit", query.limit.toString());
    if (query?.sortBy) params.append("sortBy", query.sortBy);
    if (query?.sortOrder) params.append("sortOrder", query.sortOrder);
    if (query?.createdAfter) params.append("createdAfter", query.createdAfter);
    if (query?.createdBefore)
      params.append("createdBefore", query.createdBefore);
    if (query?.updatedAfter) params.append("updatedAfter", query.updatedAfter);
    if (query?.updatedBefore)
      params.append("updatedBefore", query.updatedBefore);
    const queryString = params.toString();
    return apiRequest<{
      success: boolean;
      examQuestions: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`admin/exam-questions${queryString ? `?${queryString}` : ""}`);
  },

  getExamQuestionById: (id: string) =>
    apiRequest<{ success: boolean; examQuestion: any }>(
      `admin/exam-questions/${id}`,
    ),

  parseBulkQuestions: (text: string) =>
    apiRequest<{
      success: boolean;
      totalParsed: number;
      validQuestions: any[];
      invalidQuestions: Array<{
        index: number;
        questionText: string;
        reason: string;
      }>;
    }>(`admin/exam-questions/bulk-parse`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  bulkImportQuestions: (questions: any[]) =>
    apiRequest<{
      success: boolean;
      created: number;
      failed: number;
      errors: Array<{
        index: number;
        reason: string;
      }>;
    }>(`admin/exam-questions/bulk-import`, {
      method: "POST",
      body: JSON.stringify({ questions }),
    }),

  bulkUploadPreview: (data: { text: string; lesson: string }) =>
    apiRequest<{
      success: boolean;
      totalParsed: number;
      validCount: number;
      invalidCount: number;
      validQuestions: any[];
      invalidQuestions: Array<{
        index: number;
        questionText: string;
        reason: string;
      }>;
    }>(`admin/exam-questions/bulk/preview`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  bulkUploadSave: (data: {
    text: string;
    lesson: string;
    year: number;
    examType?: string;
  }) =>
    apiRequest<{
      success: boolean;
      savedCount: number;
      questions: any[];
      invalidCount: number;
      invalidQuestions: Array<{
        index: number;
        questionText: string;
        reason: string;
      }>;
    }>(`admin/exam-questions/bulk/save`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  bulkAnalyze: (data: { questionIds: string[] }) =>
    apiRequest<{
      success: boolean;
      queuedCount: number;
      jobIds: string[];
    }>(`admin/exam-questions/bulk/analyze`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateExamQuestion: (
    id: string,
    data: {
      year?: number;
      examType?: string;
      questionNumber?: number;
      question?: string;
      options?: Record<string, string>;
      correctAnswer?: string;
      explanation?: string;
      lesson?: string;
      topic?: string;
      subtopic?: string;
      traps?: string[];
    },
  ) =>
    apiRequest<{ success: boolean; examQuestion: any }>(
      `admin/exam-questions/${id}`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  triggerAnalysis: (id: string, lesson?: string) =>
    apiRequest<{ success: boolean; examQuestionId: string; message: string }>(
      `admin/exam-questions/${id}/analyze`,
      {
        method: "POST",
        body: JSON.stringify({ lesson }),
      },
    ),

  processAnalyzedQuestion: (id: string) =>
    apiRequest<{ success: boolean; examQuestionId: string }>(
      `admin/process-analyzed-question/${id}`,
      {
        method: "POST",
      },
    ),

  generateKnowledge: (id: string) =>
    apiRequest<{ success: boolean; knowledgePointId: string }>(
      `admin/exam-questions/${id}/generate-knowledge`,
      {
        method: "POST",
      },
    ),

  generateQuestion: (id: string, provider?: "OPENAI" | "GEMINI") =>
    apiRequest<{
      success: boolean;
      generatedQuestionId: string;
      similarityResult?: any;
    }>(`admin/exam-questions/${id}/generate-question`, {
      method: "POST",
      body: JSON.stringify({ provider }),
    }),

  createExamReplica: (id: string) =>
    apiRequest<{
      success: boolean;
      generatedQuestionId: string;
    }>(`admin/exam-questions/${id}/generate-replica-question`, {
      method: "POST",
    }),

  bulkCreateReplicas: (questionIds: string[]) =>
    apiRequest<{
      success: boolean;
      created: number;
      skipped: number;
      errors: number;
    }>(`admin/exam-questions/bulk/create-replicas`, {
      method: "POST",
      body: JSON.stringify({ questionIds }),
    }),

  bulkAnalyzeQuestions: (questionIds: string[]) =>
    apiRequest<{
      success: boolean;
      queued: number;
      skipped: number;
      alreadyProcessing: number;
    }>(`admin/exam-questions/bulk/analyze`, {
      method: "POST",
      body: JSON.stringify({ questionIds }),
    }),

  bulkProcessQuestions: (questionIds: string[]) =>
    apiRequest<{
      success: boolean;
      processed: number;
      skipped: number;
      errors: number;
    }>(`admin/exam-questions/bulk/process`, {
      method: "POST",
      body: JSON.stringify({ questionIds }),
    }),

  bulkGenerateKnowledgePoints: (questionIds: string[]) =>
    apiRequest<{
      success: boolean;
      successful: number;
      failed: number;
      results: Array<{
        examQuestionId: string;
        success: boolean;
        kpCount?: number;
        spotRuleCount?: number;
        clinicalCorrelationCount?: number;
        examTrapCount?: number;
        error?: string;
      }>;
    }>(`knowledge-extraction/admin/generate/exam-questions`, {
      method: "POST",
      body: JSON.stringify({ examQuestionIds: questionIds }),
    }),

  getKnowledgePointsForExamQuestion: (examQuestionId: string) =>
    apiRequest<{ success: boolean; knowledgePoints: any[] }>(
      `admin/exam-questions/${examQuestionId}/knowledge-points`,
    ),

  linkKnowledgePoint: (
    id: string,
    data: {
      knowledgePointId: string;
      relationshipType: "MEASURED" | "TRAP" | "CONTEXT";
    },
  ) =>
    apiRequest<{ success: boolean; link: any }>(
      `admin/exam-questions/${id}/knowledge-points`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  unlinkKnowledgePoint: (
    id: string,
    knowledgePointId: string,
    relationshipType: "MEASURED" | "TRAP" | "CONTEXT",
  ) => {
    const params = new URLSearchParams();
    params.append("relationshipType", relationshipType);
    return apiRequest<{ success: boolean }>(
      `admin/exam-questions/${id}/knowledge-points/${knowledgePointId}?${params.toString()}`,
      {
        method: "DELETE",
      },
    );
  },

  linkConcept: (id: string, data: { conceptId: string }) =>
    apiRequest<{ success: boolean; link: any }>(
      `admin/exam-questions/${id}/concepts`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  unlinkConcept: (id: string, conceptId: string) =>
    apiRequest<{ success: boolean }>(
      `admin/exam-questions/${id}/concepts/${conceptId}`,
      {
        method: "DELETE",
      },
    ),

  deleteExamQuestion: (id: string) =>
    apiRequest<{ success: boolean }>(`admin/exam-questions/${id}`, {
      method: "DELETE",
    }),

  bulkDeleteGeneratedQuestions: (questionIds: string[]) =>
    apiRequest<{
      success: boolean;
      deleted: number;
      notFound: number;
      errors: number;
    }>(`admin/generated-questions/bulk/delete`, {
      method: "POST",
      body: JSON.stringify({ questionIds }),
    }),

  // AI Task Config
  getAllAIConfigs: () =>
    apiRequest<{
      success: boolean;
      configs: Array<{
        id: string;
        taskType: string;
        provider: string;
        model: string;
        temperature: number;
        maxTokens: number;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
      }>;
    }>("admin/ai-config"),

  getAIConfig: (taskType: string) =>
    apiRequest<{
      success: boolean;
      config: {
        id: string;
        taskType: string;
        provider: string;
        model: string;
        temperature: number;
        maxTokens: number;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
      };
    }>(`admin/ai-config/${taskType}`),

  updateAIConfig: (
    taskType: string,
    data: {
      provider?: "OPENAI" | "GEMINI";
      model?: string;
      temperature?: number;
      maxTokens?: number;
      isActive?: boolean;
    },
  ) =>
    apiRequest<{
      success: boolean;
      config: {
        id: string;
        taskType: string;
        provider: string;
        model: string;
        temperature: number;
        maxTokens: number;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
      };
    }>(`admin/ai-config/${taskType}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Concept Explorer
  getConcepts: (filters?: {
    search?: string;
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.offset) params.append("offset", filters.offset.toString());

    return apiRequest<{
      success: boolean;
      concepts: any[];
      total: number;
    }>(`admin/concepts?${params.toString()}`);
  },

  getConcept: (conceptId: string) =>
    apiRequest<{ success: boolean; concept: any }>(
      `admin/concepts/${conceptId}`,
    ),

  createConcept: (data: {
    preferredLabel: string;
    conceptType: string;
    normalizedKey?: string;
  }) =>
    apiRequest<{ success: boolean; concept: any }>("admin/concepts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateConcept: (
    conceptId: string,
    data: {
      preferredLabel?: string;
      conceptType?: string;
      status?: string;
    },
  ) =>
    apiRequest<{ success: boolean; concept: any }>(
      `admin/concepts/${conceptId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    ),

  mergeConcepts: (data: { sourceId: string; targetId: string }) =>
    apiRequest<{ success: boolean; message: string }>("admin/concepts/merge", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMergePreview: (sourceId: string, targetId: string) =>
    apiRequest<{
      success: boolean;
      preview: {
        aliasesToMigrate: string[];
        prerequisitesToMigrate: number;
        questionsToMigrate: number;
      };
    }>(
      `admin/concepts/merge-preview?sourceId=${sourceId}&targetId=${targetId}`,
    ),

  addConceptAlias: (
    conceptId: string,
    data: {
      alias: string;
      language: "TR" | "EN" | "LA";
      source?: "ADMIN";
    },
  ) =>
    apiRequest<{ success: boolean; alias: any }>(
      `admin/concepts/${conceptId}/alias`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  disableConceptAlias: (conceptId: string, aliasId: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `admin/concepts/${conceptId}/alias/${aliasId}`,
      {
        method: "DELETE",
      },
    ),

  searchConcepts: (query: string) =>
    apiRequest<{ success: boolean; concepts: any[] }>(
      `admin/concepts/search?q=${encodeURIComponent(query)}`,
    ),

  // Ontology Resolution
  getQuestionsNeedingReview: (lesson?: string) =>
    apiRequest<{
      success: boolean;
      count: number;
      questions: any[];
    }>(`admin/exam-questions/needs-review${lesson ? `?lesson=${lesson}` : ""}`),

  getUnmatchedOntologySuggestions: (params: {
    lesson?: string;
    minOccurrences?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params.lesson) queryParams.append("lesson", params.lesson);
    if (params.minOccurrences)
      queryParams.append("minOccurrences", params.minOccurrences.toString());
    return apiRequest<{
      success: boolean;
      suggestions: {
        topics: Array<{ name: string; lesson: string; count: number }>;
        subtopics: Array<{ name: string; lesson: string; count: number }>;
        concepts: Array<{ name: string; lesson: string; count: number }>;
      };
    }>(`admin/ontology/unmatched-suggestions?${queryParams.toString()}`);
  },

  resolveOntologyMismatches: (
    questionId: string,
    data: {
      action: "APPROVE_AS_IS" | "REJECT_SUGGESTIONS" | "RESOLVE";
      topicId?: string;
      subtopicId?: string;
      conceptIds?: string[];
    },
  ) =>
    apiRequest<{
      success: boolean;
      action: string;
      status?: string;
    }>(`admin/exam-questions/${questionId}/resolve-ontology`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  bulkResolveOntology: (data: {
    questionIds: string[];
    action: "APPROVE_AS_IS" | "REJECT_SUGGESTIONS";
  }) =>
    apiRequest<{
      message: string;
      action: string;
      total: number;
      success: number;
      failed: number;
      errors: Array<{ questionId: string; error: string }>;
    }>("admin/exam-questions/bulk-resolve-ontology", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createOntologyEntity: (data: {
    name: string;
    entityType: "TOPIC" | "SUBTOPIC" | "CONCEPT";
    lessonId: string;
    topicId?: string;
    subtopicId?: string;
  }) =>
    apiRequest<{
      success: boolean;
      entityType: string;
      entity: any;
    }>("admin/ontology/create", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  validateTopicOrSubtopic: (data: {
    lessonId: string;
    proposedName: string;
    parentTopicId?: string;
  }) =>
    apiRequest<{
      decision: "TOPIC" | "SUBTOPIC" | "REJECT";
      reason: string;
      confidence: number;
      suggestion?: string;
    }>("admin/topics/validate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createTopic: (data: {
    lessonId: string;
    name: string;
    displayName?: string;
  }) =>
    apiRequest<{
      success: boolean;
      topic: any;
    }>("admin/topics", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createSubtopic: (data: {
    topicId: string;
    name: string;
    displayName?: string;
  }) =>
    apiRequest<{
      success: boolean;
      subtopic: any;
    }>("admin/subtopics", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
