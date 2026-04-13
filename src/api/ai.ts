import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { AIAnalysisResponse, SessionCoachResponse, FitnessChatResponse, SessionPlanResponse, WeeklyScheduleResponse, GeneratedDay } from '@/types';

interface DateRange {
  startDate?: string;
  endDate?: string;
}

function toBackendDateRange(payload?: DateRange) {
  if (!payload) return undefined;
  const out: Record<string, string> = {};
  if (payload.startDate) out.fromDate = payload.startDate;
  if (payload.endDate) out.toDate = payload.endDate;
  return out;
}

export function useAnalyzeSessions() {
  return useMutation({
    mutationFn: async (payload?: DateRange & { question?: string }) => {
      const body = { ...toBackendDateRange(payload), question: payload?.question };
      const { data } = await apiClient.post<AIAnalysisResponse>(
        '/ai/analyze-sessions',
        body,
      );
      return data;
    },
  });
}

export function useAnalyzeExercise() {
  return useMutation({
    mutationFn: async (payload: { exerciseName: string; question?: string } & DateRange) => {
      const body = {
        exerciseName: payload.exerciseName,
        question: payload.question,
        ...toBackendDateRange(payload),
      };
      const { data } = await apiClient.post<AIAnalysisResponse>(
        '/ai/analyze-exercise',
        body,
      );
      return data;
    },
  });
}

export function useAnalyzeWeight() {
  return useMutation({
    mutationFn: async (payload?: DateRange & { question?: string }) => {
      const body = { ...toBackendDateRange(payload), question: payload?.question };
      const { data } = await apiClient.post<AIAnalysisResponse>(
        '/ai/analyze-weight',
        body,
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

export function useGenerateWeeklySchedule() {
  return useMutation({
    mutationFn: async (payload?: { preferences?: string }) => {
      const { data } = await apiClient.post<WeeklyScheduleResponse>(
        '/ai/generate-weekly-schedule',
        payload || {},
      );
      return data;
    },
  });
}

export function useCustomizeSplit() {
  return useMutation({
    mutationFn: async (payload: { splitId: string; preferences?: string }) => {
      const { data } = await apiClient.post<GeneratedDay>(
        '/ai/customize-split',
        payload,
      );
      return data;
    },
  });
}

export function useSessionPlan(sessionId: string) {
  return useQuery({
    queryKey: ['session-plan', sessionId],
    queryFn: async () => {
      const { data } = await apiClient.post<SessionPlanResponse>(
        '/ai/session-plan',
        { sessionId },
      );
      return data;
    },
    enabled: !!sessionId,
    staleTime: 10 * 60 * 1000, // cache for 10 minutes — plan doesn't change mid-session
    retry: 1,
  });
}
