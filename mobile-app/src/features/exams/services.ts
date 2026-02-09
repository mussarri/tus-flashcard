import api from '@services/api';
import { ExamQuestion, GeneratedQuestion, QuizSubmission, QuizResult } from './types';

export const examService = {
    getPracticeQuestions: async (params: { lessonId?: string; limit?: number }): Promise<(ExamQuestion | GeneratedQuestion)[]> => {
        const response = await api.get('/questions/practice', { params });
        return response.data;
    },

    submitAnswer: async (submission: QuizSubmission): Promise<QuizResult> => {
        const response = await api.post(`/questions/${submission.questionId}/answer`, {
            selectedAnswer: submission.selectedAnswer,
            timeSpent: submission.timeSpent,
        });
        return response.data;
    },

    getMockExam: async (examType: string) => {
        const response = await api.get(`/exams/mock/${examType}`);
        return response.data;
    },
};
