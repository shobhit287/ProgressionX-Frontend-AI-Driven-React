import { useMutation, useQuery } from '@tanstack/react-query';
import * as ai from '@/local/ai/service';

interface DateRange {
  startDate?: string;
  endDate?: string;
}

function toRange(payload?: DateRange) {
  return { fromDate: payload?.startDate, toDate: payload?.endDate };
}

export function useAnalyzeSessions() {
  return useMutation({
    mutationFn: (payload?: DateRange & { question?: string }) =>
      ai.analyzeSessions({ ...toRange(payload), question: payload?.question }),
  });
}

export function useAnalyzeExercise() {
  return useMutation({
    mutationFn: (payload: { exerciseName: string; question?: string } & DateRange) =>
      ai.analyzeExercise({ ...toRange(payload), exerciseName: payload.exerciseName, question: payload.question }),
  });
}

export function useAnalyzeWeight() {
  return useMutation({
    mutationFn: (payload?: DateRange & { question?: string }) =>
      ai.analyzeWeight({ ...toRange(payload), question: payload?.question }),
  });
}

export function useAnalyzeSplit() {
  return useMutation({
    mutationFn: (payload: { question: string }) => ai.analyzeSplit(payload.question),
  });
}

export function useFitnessChat() {
  return useMutation({
    mutationFn: (payload: { question: string; history: { role: string; content: string }[] }) =>
      ai.fitnessChat(payload.question, payload.history),
  });
}

export function useSessionCoach() {
  return useMutation({
    mutationFn: (payload: { sessionId: string; question: string }) =>
      ai.sessionCoach(payload.sessionId, payload.question),
  });
}

export function useGenerateWeeklySchedule() {
  return useMutation({
    mutationFn: (payload?: { preferences?: string }) =>
      ai.generateWeeklySchedule(payload?.preferences || undefined),
  });
}

export function useCustomizeSplit() {
  return useMutation({
    mutationFn: (payload: { splitId: string; preferences?: string }) =>
      ai.customizeSplit(payload.splitId, payload.preferences || undefined),
  });
}

export function useSessionPlan(sessionId: string) {
  return useQuery({
    queryKey: ['session-plan', sessionId],
    queryFn: () => ai.generateSessionPlan(sessionId),
    enabled: !!sessionId,
    staleTime: 10 * 60 * 1000, // cache for 10 minutes — plan doesn't change mid-session
    retry: 1,
  });
}
