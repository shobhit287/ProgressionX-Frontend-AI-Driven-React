import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { PaginatedResponse, WeightAnalytics, WeightLog } from '@/types';

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

function toBackendParams(filters?: WeightLogFilters) {
  if (!filters) return undefined;
  const params: Record<string, string | number> = {};
  if (filters.startDate) params.fromDate = filters.startDate;
  if (filters.endDate) params.toDate = filters.endDate;
  if (filters.page) params.page = filters.page;
  if (filters.pageSize) params.pageSize = filters.pageSize;
  return params;
}

export function useWeightLogs(filters?: WeightLogFilters) {
  return useQuery({
    queryKey: weightLogKeys.all(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<WeightLog>>('/weight-logs', {
        params: toBackendParams(filters),
      });
      return data;
    },
  });
}

export function useWeightAnalytics(filters?: WeightLogFilters) {
  return useQuery({
    queryKey: weightLogKeys.analytics(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<WeightAnalytics>('/weight-logs/analytics', {
        params: toBackendParams(filters),
      });
      return data;
    },
  });
}

export function useCreateWeightLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      weightKg: number;
      waistCm?: number;
      bodyFatPct?: number;
      description?: string;
      loggedAt?: string;
    }) => {
      const { data } = await apiClient.post<WeightLog>('/weight-logs', payload);
      return data;
    },
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
    mutationFn: async (id: string) => {
      await apiClient.delete(`/weight-logs/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weightLogs'] });
    },
  });
}
