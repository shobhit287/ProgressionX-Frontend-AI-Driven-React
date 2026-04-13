import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { DashboardSummary, ExerciseDataPoint, SessionDataPoint } from '@/types';

export const analyticsKeys = {
  sessions: (filters?: AnalyticsFilters) => ['analytics', 'sessions', filters] as const,
  exercise: (name: string, filters?: AnalyticsFilters) =>
    ['analytics', 'exercise', name, filters] as const,
  dashboard: ['analytics', 'dashboard'] as const,
};

interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  splitId?: string;
}

function toBackendParams(filters?: AnalyticsFilters) {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  if (filters.startDate) params.fromDate = filters.startDate;
  if (filters.endDate) params.toDate = filters.endDate;
  if (filters.splitId) params.splitId = filters.splitId;
  return params;
}

interface SessionAnalyticsResponse {
  sessions: SessionDataPoint[];
}

interface ExerciseAnalyticsResponse {
  dataPoints: ExerciseDataPoint[];
  personalRecord?: {
    weight: number;
    reps: number;
    estimated1Rm: number;
    date: string;
  } | null;
}

export function useSessionAnalytics(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.sessions(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<SessionAnalyticsResponse>(
        '/analytics/sessions',
        { params: toBackendParams(filters) },
      );
      return data.sessions ?? [];
    },
  });
}

export function useExerciseAnalytics(exerciseName: string, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.exercise(exerciseName, filters),
    queryFn: async () => {
      const { data } = await apiClient.get<ExerciseAnalyticsResponse>(
        `/analytics/exercises/${encodeURIComponent(exerciseName)}`,
        { params: toBackendParams(filters) },
      );
      return data.dataPoints ?? [];
    },
    enabled: !!exerciseName,
  });
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: analyticsKeys.dashboard,
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardSummary>('/analytics/summary');
      return data;
    },
  });
}
