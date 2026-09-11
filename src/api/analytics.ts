import { useQuery } from '@tanstack/react-query';
import * as local from '@/local/analytics';

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

function toRange(filters?: AnalyticsFilters): local.AnalyticsRange {
  return {
    fromDate: filters?.startDate,
    toDate: filters?.endDate,
    splitId: filters?.splitId,
  };
}

export function useSessionAnalytics(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.sessions(filters),
    queryFn: () => local.sessionAnalytics(toRange(filters)),
  });
}

export function useExerciseAnalytics(exerciseName: string, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.exercise(exerciseName, filters),
    queryFn: async () => (await local.exerciseAnalytics(exerciseName, toRange(filters))).dataPoints,
    enabled: !!exerciseName,
  });
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: analyticsKeys.dashboard,
    queryFn: () => local.dashboardSummary(),
  });
}
