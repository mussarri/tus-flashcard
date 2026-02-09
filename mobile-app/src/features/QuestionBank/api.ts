import axios from 'axios';
import { QuestionCard, QuestionFilter, SubmitAnswerRequest, AnswerResult, Lesson, Topic } from './types';

// API base URL - Update this to match your backend
// For local development: http://localhost:3000 or http://10.0.2.2:3000 (Android emulator)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// TODO: Add auth interceptor when authentication is implemented
// api.interceptors.request.use((config) => {
//     const token = getAuthToken();
//     if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
// });

export const getNextQuestions = async (filters: QuestionFilter = {}): Promise<QuestionCard[]> => {
    try {
        const params = new URLSearchParams();

        if (filters.lessonId) params.append('lessonId', filters.lessonId);
        if (filters.topicId) params.append('topicId', filters.topicId);
        if (filters.subtopicId) params.append('subtopicId', filters.subtopicId);
        if (filters.difficulty) params.append('difficulty', filters.difficulty.toUpperCase());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.sourceType) params.append('sourceType', filters.sourceType);

        const response = await api.get(`/api/student/questions?${params.toString()}`);
        return response.data.questions || response.data;
    } catch (error) {
        console.error('Failed to fetch questions:', error);
        throw new Error('Failed to load questions. Please check your connection.');
    }
};

export const submitAnswer = async (questionId: string, payload: SubmitAnswerRequest): Promise<AnswerResult> => {
    try {
        // Backend expects: { userId, selectedAnswer, timeSpent }
        // We'll use a mock userId for now - TODO: get from auth context
        const response = await api.post(`/api/student/questions/${questionId}/answer`, {
            userId: 'student-mock-id', // TODO: Replace with actual user ID from auth
            selectedAnswer: payload.selectedOption,
            timeSpent: Math.floor(payload.durationMs / 1000), // Convert ms to seconds
        });

        const data = response.data;

        return {
            isCorrect: data.isCorrect,
            correctOption: data.correctAnswer,
            mainExplanation: data.explanation || data.mainExplanation || '',
            optionsMetadata: data.optionsMetadata || {},
            examTrap: data.examTrap,
            clinicalCorrelation: data.clinicalCorrelation,
            spatialContexts: data.spatialContexts,
            remediation: data.affectedKnowledgePoints?.length > 0 ? {
                knowledgePointIds: data.affectedKnowledgePoints,
            } : undefined,
        };
    } catch (error) {
        console.error('Failed to submit answer:', error);
        throw new Error('Failed to submit answer. Please try again.');
    }
};


// TODO: Move this mapping to backend or a shared config
const LESSON_ICONS: Record<string, string> = {
    'Anatomi': 'body',
    'Fizyoloji': 'pulse',
    'Biyokimya': 'flask',
    'Mikrobiyoloji': 'bug',
    'Patoloji': 'medkit',
    'Farmakoloji': 'bandage',
    'Dahiliye': 'medical',
    'Pediatri': 'happy',
    'Genel Cerrahi': 'cut',
    'Kadın Doğum': 'woman',
    'Küçük Stajlar': 'book',
};

const determineCategory = (name: string): 'BASIC' | 'CLINICAL' => {
    const basicSciences = ['Anatomi', 'Fizyoloji', 'Biyokimya', 'Mikrobiyoloji', 'Patoloji', 'Farmakoloji'];
    return basicSciences.some(s => name.includes(s)) ? 'BASIC' : 'CLINICAL';
};

export const getLessons = async (): Promise<Lesson[]> => {
    try {
        const response = await api.get('/api/student/questions/lessons');
        const lessons: Lesson[] = response.data;

        console.log('Lessons:', lessons);

        // Enrich with UI metadata locally for now
        return lessons.map(l => ({
            ...l,
            category: determineCategory(l.name),
            icon: LESSON_ICONS[l.name] || 'book-outline', // Default icon
        }));
    } catch (error) {
        console.error('Failed to fetch lessons:', error);
        // Fallback to mock if dev/offline? Or just throw. 
        // For now, let's throw to be explicit about backend dependency.
        throw error;
    }
};

export const getAllLessons = async (): Promise<Lesson[]> => {
    try {
        const response = await api.get('/api/student/questions/all-lessons');
        const lessons: Lesson[] = response.data;
        return lessons.map(l => ({
            ...l,
            category: determineCategory(l.name),
            icon: LESSON_ICONS[l.name] || 'book-outline',
        }));
    } catch (error) {
        console.error('Failed to fetch all lessons:', error);
        throw error;
    }
};


