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

export function useSessionAnalytics(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.sessions(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<SessionDataPoint[]>('/analytics/sessions', {
        params: filters,
      });
      return data;
    },
  });
}

export function useExerciseAnalytics(exerciseName: string, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.exercise(exerciseName, filters),
    queryFn: async () => {
      const { data } = await apiClient.get<ExerciseDataPoint[]>(
        `/analytics/exercises/${encodeURIComponent(exerciseName)}`,
        { params: filters },
      );
      return data;
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
