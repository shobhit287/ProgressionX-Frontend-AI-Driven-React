import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { WorkoutSplit, GeneratedDay } from '@/types';

export const splitKeys = {
  all: ['splits'] as const,
  today: ['splits', 'today'] as const,
  detail: (id: string) => ['splits', id] as const,
};

export function useSplits() {
  return useQuery({
    queryKey: splitKeys.all,
    queryFn: async () => {
      const { data } = await apiClient.get<WorkoutSplit[]>('/splits');
      return data;
    },
  });
}

export function useTodaySplit() {
  return useQuery({
    queryKey: splitKeys.today,
    queryFn: async () => {
      const { data } = await apiClient.get<WorkoutSplit>('/splits/today');
      return data;
    },
  });
}

export function useSplit(id: string) {
  return useQuery({
    queryKey: splitKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<WorkoutSplit>(`/splits/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<WorkoutSplit>) => {
      const { data } = await apiClient.post<WorkoutSplit>('/splits', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: splitKeys.all });
      void queryClient.invalidateQueries({ queryKey: splitKeys.today });
    },
  });
}

export function useUpdateSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<WorkoutSplit> & { id: string }) => {
      const { data } = await apiClient.patch<WorkoutSplit>(`/splits/${id}`, payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: splitKeys.all });
      void queryClient.invalidateQueries({ queryKey: splitKeys.today });
      void queryClient.invalidateQueries({ queryKey: splitKeys.detail(variables.id) });
    },
  });
}

export function useBulkReplaceSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (days: GeneratedDay[]) => {
      const { data } = await apiClient.post<WorkoutSplit[]>(
        '/splits/bulk-replace-schedule',
        { days },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: splitKeys.all });
      void queryClient.invalidateQueries({ queryKey: splitKeys.today });
    },
  });
}

export function useDeleteSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/splits/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: splitKeys.all });
      void queryClient.invalidateQueries({ queryKey: splitKeys.today });
    },
  });
}

export function useReplaceSingleSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GeneratedDay }) => {
      const { data: updatedSplit } = await apiClient.post<WorkoutSplit>(
        `/splits/${id}/replace`,
        data,
      );
      return updatedSplit;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: splitKeys.all });
      void queryClient.invalidateQueries({ queryKey: splitKeys.today });
      void queryClient.invalidateQueries({ queryKey: splitKeys.detail(variables.id) });
      // Also invalidate exercises for this split
      void queryClient.invalidateQueries({ queryKey: ['exercises', variables.id] });
    },
  });
}
