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

export function useWeightLogs(filters?: WeightLogFilters) {
  return useQuery({
    queryKey: weightLogKeys.all(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<WeightLog>>('/weight-logs', {
        params: filters,
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
        params: filters,
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
      void queryClient.invalidateQueries({ queryKey: ['weightLogs'] });
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
