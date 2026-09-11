import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as local from '@/local/splitExercises';
import { sessionKeys } from '@/api/sessions';
import type { SplitExercise } from '@/types';

export const exerciseKeys = {
  bySplit: (splitId: string) => ['exercises', splitId] as const,
  names: ['exercises', 'names'] as const,
};

export function useExerciseNames() {
  return useQuery({
    queryKey: exerciseKeys.names,
    queryFn: () => local.allExerciseNames(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSplitExercises(splitId: string) {
  return useQuery({
    queryKey: exerciseKeys.bySplit(splitId),
    queryFn: () => local.listBySplit(splitId),
    enabled: !!splitId,
  });
}

function invalidateAfterChange(
  queryClient: ReturnType<typeof useQueryClient>,
  splitId: string,
) {
  void queryClient.invalidateQueries({ queryKey: exerciseKeys.bySplit(splitId) });
  void queryClient.invalidateQueries({ queryKey: exerciseKeys.names });
  void queryClient.invalidateQueries({ queryKey: sessionKeys.active });
  void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ splitId, ...payload }: Partial<SplitExercise> & { splitId: string }) =>
      local.createExercise(splitId, payload),
    onSuccess: (_data, variables) => invalidateAfterChange(queryClient, variables.splitId),
  });
}

export function useUpdateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      splitId,
      id,
      ...payload
    }: Partial<SplitExercise> & { splitId: string; id: string }) =>
      local.updateExercise(splitId, id, payload),
    onSuccess: (_data, variables) => invalidateAfterChange(queryClient, variables.splitId),
  });
}

export function useDeleteExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ splitId, id }: { splitId: string; id: string }) =>
      local.deleteExercise(splitId, id),
    onSuccess: (_data, variables) => invalidateAfterChange(queryClient, variables.splitId),
  });
}

export function useReorderExercises() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ splitId, orderedIds }: { splitId: string; orderedIds: string[] }) =>
      local.reorderExercises(
        splitId,
        orderedIds.map((id, idx) => ({ id, displayOrder: idx + 1 })),
      ),
    onSuccess: (_data, variables) => invalidateAfterChange(queryClient, variables.splitId),
  });
}
