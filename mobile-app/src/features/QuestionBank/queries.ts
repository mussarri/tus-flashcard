import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNextQuestions,
  submitAnswer,
  getLessons,
  getAllLessons,
} from "./api";
import { QuestionFilter, SubmitAnswerRequest } from "./types";

export const QUESTION_KEYS = {
  all: ["questions"] as const,
  lists: () => [...QUESTION_KEYS.all, "list"] as const,
  list: (filters: QuestionFilter) =>
    [...QUESTION_KEYS.lists(), filters] as const,
  lessons: ["lessons"] as const,
  topics: (lessonId: string) => ["topics", lessonId] as const,
};

export const useQuestionQueue = (filters: QuestionFilter = {}) => {
  return useQuery({
    queryKey: QUESTION_KEYS.list(filters),
    queryFn: () => getNextQuestions(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useSubmitAnswer = () => {
  // const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      questionId,
      payload,
    }: {
      questionId: string;
      payload: SubmitAnswerRequest;
    }) => submitAnswer(questionId, payload),
    onSuccess: (data) => {
      // In layout, we might want to invalidate queries or update user stats
      console.log("Answer submitted successfully", data);
    },
  });
};

export const useAllLessons = () => {
  return useQuery({
    queryKey: ["all-lessons"],
    queryFn: getAllLessons,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
