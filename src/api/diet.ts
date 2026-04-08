import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';

export interface DietPlan {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface DietChatResponse {
  answer: string;
}

interface GenerateDietResponse {
  diet: string;
}

export const dietKeys = {
  plan: ['diet', 'plan'] as const,
};

export function useDietPlan() {
  return useQuery({
    queryKey: dietKeys.plan,
    queryFn: async () => {
      const { data } = await apiClient.get<DietPlan | null>('/diet/plan');
      return data;
    },
  });
}

export function useSaveDietPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const { data } = await apiClient.put<DietPlan>('/diet/plan', { content });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dietKeys.plan });
    },
  });
}

export function useDeleteDietPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete('/diet/plan');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dietKeys.plan });
    },
  });
}

export function useDietChat() {
  return useMutation({
    mutationFn: async (payload: { question: string; history: { role: string; content: string }[] }) => {
      const { data } = await apiClient.post<DietChatResponse>('/diet/chat', payload);
      return data;
    },
  });
}

export function useGenerateDiet() {
  return useMutation({
    mutationFn: async (preferences?: string) => {
      const { data } = await apiClient.post<GenerateDietResponse>(
        '/diet/generate',
        preferences ? { preferences } : {},
      );
      return data;
    },
  });
}
