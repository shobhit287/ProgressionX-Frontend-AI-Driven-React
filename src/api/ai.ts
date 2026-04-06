import { useMutation } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { AIAnalysisResponse, SessionCoachResponse, FitnessChatResponse } from '@/types';

export function useAnalyzeSessions() {
  return useMutation({
    mutationFn: async (payload?: { startDate?: string; endDate?: string }) => {
      const { data } = await apiClient.post<AIAnalysisResponse>(
        '/ai/analyze/sessions',
        payload,
      );
      return data;
    },
  });
}

export function useAnalyzeExercise() {
  return useMutation({
    mutationFn: async (payload: { exerciseName: string; startDate?: string; endDate?: string }) => {
      const { data } = await apiClient.post<AIAnalysisResponse>(
        '/ai/analyze/exercise',
        payload,
      );
      return data;
    },
  });
}

export function useAnalyzeWeight() {
  return useMutation({
    mutationFn: async (payload?: { startDate?: string; endDate?: string }) => {
      const { data } = await apiClient.post<AIAnalysisResponse>(
        '/ai/analyze/weight',
        payload,
      );
      return data;
    },
  });
}

export function useFitnessChat() {
  return useMutation({
    mutationFn: async (payload: {
      question: string;
      history: { role: string; content: string }[];
    }) => {
      const { data } = await apiClient.post<FitnessChatResponse>(
        '/ai/chat',
        payload,
      );
      return data;
    },
  });
}

export function useSessionCoach() {
  return useMutation({
    mutationFn: async (payload: { sessionId: string; question: string }) => {
      const { data } = await apiClient.post<SessionCoachResponse>(
        '/ai/session-coach',
        payload,
      );
      return data;
    },
  });
}
