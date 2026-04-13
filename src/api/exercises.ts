import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { sessionKeys } from '@/api/sessions';
import type { SplitExercise } from '@/types';

export const exerciseKeys = {
  bySplit: (splitId: string) => ['exercises', splitId] as const,
  names: ['exercises', 'names'] as const,
};

export function useExerciseNames() {
  return useQuery({
    queryKey: exerciseKeys.names,
    queryFn: async () => {
      const { data } = await apiClient.get<string[]>('/exercises/names');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSplitExercises(splitId: string) {
  return useQuery({
    queryKey: exerciseKeys.bySplit(splitId),
    queryFn: async () => {
      const { data } = await apiClient.get<SplitExercise[]>(`/splits/${splitId}/exercises`);
      return data;
    },
    enabled: !!splitId,
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ splitId, ...payload }: Partial<SplitExercise> & { splitId: string }) => {
      const { data } = await apiClient.post<SplitExercise>(
        `/splits/${splitId}/exercises`,
        payload,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: exerciseKeys.bySplit(variables.splitId) });
    },
  });
}

export function useUpdateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      splitId,
      id,
      ...payload
    }: Partial<SplitExercise> & { splitId: string; id: string }) => {
      const { data } = await apiClient.patch<SplitExercise>(
        `/splits/${splitId}/exercises/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: exerciseKeys.bySplit(variables.splitId) });
    },
  });
}

export function useDeleteExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ splitId, id }: { splitId: string; id: string }) => {
      await apiClient.delete(`/splits/${splitId}/exercises/${id}`);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: exerciseKeys.bySplit(variables.splitId) });
      // Also refresh active session so deleted exercise disappears from it
      void queryClient.invalidateQueries({ queryKey: sessionKeys.active });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

export function useReorderExercises() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      splitId,
      orderedIds,
    }: {
      splitId: string;
      orderedIds: string[];
    }) => {
      const exercises = orderedIds.map((id, idx) => ({
        id,
        displayOrder: idx + 1,
      }));
      const { data } = await apiClient.patch<SplitExercise[]>(
        `/splits/${splitId}/exercises/reorder`,
        { exercises },
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: exerciseKeys.bySplit(variables.splitId) });
    },
  });
}
