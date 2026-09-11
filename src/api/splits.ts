import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as local from '@/local/splits';
import type { WorkoutSplit, GeneratedDay } from '@/types';

export const splitKeys = {
  all: ['splits'] as const,
  today: ['splits', 'today'] as const,
  detail: (id: string) => ['splits', id] as const,
};

export function useSplits() {
  return useQuery({
    queryKey: splitKeys.all,
    queryFn: () => local.listSplits(),
  });
}

export function useTodaySplit() {
  return useQuery({
    queryKey: splitKeys.today,
    queryFn: () => local.getTodaySplit(),
  });
}

export function useSplit(id: string) {
  return useQuery({
    queryKey: splitKeys.detail(id),
    queryFn: () => local.getSplit(id),
    enabled: !!id,
  });
}

export function useCreateSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<WorkoutSplit>) => local.createSplit(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: splitKeys.all });
      void queryClient.invalidateQueries({ queryKey: splitKeys.today });
    },
  });
}

export function useUpdateSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<WorkoutSplit> & { id: string }) =>
      local.updateSplit(id, payload),
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
    mutationFn: (days: GeneratedDay[]) => local.bulkReplaceSchedule(days),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: splitKeys.all });
      void queryClient.invalidateQueries({ queryKey: splitKeys.today });
      void queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
}

export function useDeleteSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => local.deleteSplit(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: splitKeys.all });
      void queryClient.invalidateQueries({ queryKey: splitKeys.today });
      void queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useReplaceSingleSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GeneratedDay }) =>
      local.replaceSingleSplit(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: splitKeys.all });
      void queryClient.invalidateQueries({ queryKey: splitKeys.today });
      void queryClient.invalidateQueries({ queryKey: splitKeys.detail(variables.id) });
      // Also invalidate exercises for this split
      void queryClient.invalidateQueries({ queryKey: ['exercises', variables.id] });
    },
  });
}
