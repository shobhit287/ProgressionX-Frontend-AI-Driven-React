import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as sessionsLocal from '@/local/sessions';
import * as local from '@/local/sets';
import { sessionKeys } from '@/api/sessions';

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
  rest_seconds: number | null;
}

export type PreviousSetsMap = Record<string, PreviousSetData[]>;

export function usePreviousSets(sessionId: string) {
  return useQuery({
    queryKey: ['previous-sets', sessionId],
    queryFn: () => sessionsLocal.previousSetsMap(sessionId),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

function invalidateSession(queryClient: ReturnType<typeof useQueryClient>, sessionId: string) {
  void queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
  void queryClient.invalidateQueries({ queryKey: sessionKeys.active });
  void queryClient.invalidateQueries({ queryKey: ['analytics'] });
}

export function useAddSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
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
    }) => local.addSet(sessionId, exerciseId, payload),
    onSuccess: (_data, variables) => invalidateSession(queryClient, variables.sessionId),
  });
}

export function useUpdateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    // `exerciseId` stays in the signature for the callers; the local
    // service only needs the set id.
    mutationFn: (vars: {
      sessionId: string;
      exerciseId: string;
      setId: string;
      weightKg?: number;
      reps?: number;
      repsInReserve?: number;
      isWarmup?: boolean;
      isDropset?: boolean;
      description?: string;
    }) =>
      local.updateSet(vars.sessionId, vars.setId, {
        weightKg: vars.weightKg,
        reps: vars.reps,
        repsInReserve: vars.repsInReserve,
        isWarmup: vars.isWarmup,
        isDropset: vars.isDropset,
        description: vars.description,
      }),
    onSuccess: (_data, variables) => invalidateSession(queryClient, variables.sessionId),
  });
}

export function useDeleteSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, setId }: { sessionId: string; setId: string }) =>
      local.deleteSet(sessionId, setId),
    onSuccess: (_data, variables) => invalidateSession(queryClient, variables.sessionId),
  });
}
