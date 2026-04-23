import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { sessionKeys } from '@/api/sessions';
import type { ExerciseSet } from '@/types';

// Previous session sets — keyed by lowercased exercise name.
export interface PreviousSetData {
  set_number: number;
  weight_kg: number;
  reps: number;
  reps_in_reserve: number | null;
  is_warmup: boolean;
  is_dropset: boolean;
  had_drops: boolean;
  description: string | null;
}

export type PreviousSetsMap = Record<string, PreviousSetData[]>;

export function usePreviousSets(sessionId: string) {
  return useQuery({
    queryKey: ['previous-sets', sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get<PreviousSetsMap>(
        `/sessions/${sessionId}/previous-sets`,
      );
      return data;
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      exerciseId,
      ...payload
    }: {
      sessionId: string;
      exerciseId: string;
      weightKg: number;
      reps: number;
      repsInReserve?: number;
      isWarmup?: boolean;
      isDropset?: boolean;
      description?: string;
      parentSetId?: string;
    }) => {
      const { data } = await apiClient.post<ExerciseSet>(
        `/sessions/${sessionId}/exercises/${exerciseId}/sets`,
        payload,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.detail(variables.sessionId) });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.active });
    },
  });
}

export function useUpdateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      exerciseId,
      setId,
      ...payload
    }: {
      sessionId: string;
      exerciseId: string;
      setId: string;
      weightKg?: number;
      reps?: number;
      repsInReserve?: number;
      isWarmup?: boolean;
      isDropset?: boolean;
      description?: string;
    }) => {
      const { data } = await apiClient.patch<ExerciseSet>(
        `/sessions/${sessionId}/sets/${setId}`,
        payload,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.detail(variables.sessionId) });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.active });
    },
  });
}

export function useDeleteSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      setId,
    }: {
      sessionId: string;
      setId: string;
    }) => {
      await apiClient.delete(
        `/sessions/${sessionId}/sets/${setId}`,
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.detail(variables.sessionId) });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.active });
    },
  });
}
