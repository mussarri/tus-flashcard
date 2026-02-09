export interface ExamQuestion {
    id: string;
    question: string;
    options: Record<string, string>; // e.g. { A: "...", B: "..." }
    correctAnswer: string;
    explanation?: string;
    year: number;
    examType?: string;
    lessonId?: string;
    topicId?: string;
}

export interface GeneratedQuestion {
    id: string;
    question: string;
    options: Record<string, string>;
    correctAnswer: string;
    explanation?: string;
    scenarioType?: string;
    isGenerated: true;
}

export interface QuizSubmission {
    questionId: string;
    selectedAnswer: string;
    timeSpent: number;
}

export interface QuizResult {
    isCorrect: boolean;
    correctAnswer: string;
    explanation?: string;
    newScore: number;
}
