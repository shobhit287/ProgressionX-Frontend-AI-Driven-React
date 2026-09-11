import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as local from '@/local/diet';
import * as ai from '@/local/ai/service';

export type { DietPlan } from '@/local/diet';

export const dietKeys = {
  plan: ['diet', 'plan'] as const,
};

export function useDietPlan() {
  return useQuery({
    queryKey: dietKeys.plan,
    queryFn: () => local.getDietPlan(),
  });
}

export function useSaveDietPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => local.saveDietPlan(content),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dietKeys.plan });
    },
  });
}

export function useDeleteDietPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => local.deleteDietPlan(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dietKeys.plan });
    },
  });
}

export function useDietChat() {
  return useMutation({
    mutationFn: (payload: { question: string; history: { role: string; content: string }[] }) =>
      ai.dietChat(payload.question, payload.history),
  });
}

export function useGenerateDiet() {
  return useMutation({
    mutationFn: (preferences?: string) => ai.generateDiet(preferences || undefined),
  });
}
