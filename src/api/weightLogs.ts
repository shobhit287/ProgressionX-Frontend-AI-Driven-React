import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as local from '@/local/weightLogs';

export const weightLogKeys = {
  all: (filters?: WeightLogFilters) => ['weightLogs', filters] as const,
  analytics: (filters?: WeightLogFilters) => ['weightLogs', 'analytics', filters] as const,
};

interface WeightLogFilters {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
}

function toLocal(filters?: WeightLogFilters): local.WeightLogFilters {
  return {
    fromDate: filters?.startDate,
    toDate: filters?.endDate,
    page: filters?.page,
    pageSize: filters?.pageSize,
  };
}

export function useWeightLogs(filters?: WeightLogFilters) {
  return useQuery({
    queryKey: weightLogKeys.all(filters),
    queryFn: () => local.listWeightLogs(toLocal(filters)),
  });
}

export function useWeightAnalytics(filters?: WeightLogFilters) {
  return useQuery({
    queryKey: weightLogKeys.analytics(filters),
    queryFn: () => local.weightAnalytics(toLocal(filters)),
  });
}

export function useCreateWeightLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      weightKg: number;
      waistCm?: number;
      bodyFatPct?: number;
      description?: string;
      loggedAt?: string;
    }) => local.createWeightLog(payload),
    onSuccess: () => {
      // Invalidate both logs and analytics so charts update immediately
      void queryClient.invalidateQueries({ queryKey: ['weightLogs'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics', 'dashboard'] });
    },
  });
}

export function useDeleteWeightLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => local.deleteWeightLog(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weightLogs'] });
    },
  });
}
