import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { PaginatedResponse, WorkoutSession, WorkoutSessionDetail } from '@/types';

export const sessionKeys = {
  all: ['sessions'] as const,
  active: ['sessions', 'active'] as const,
  detail: (id: string) => ['sessions', id] as const,
};

interface SessionFilters {
  page?: number;
  pageSize?: number;
  status?: string;
}

export function useActiveSession() {
  return useQuery({
    queryKey: sessionKeys.active,
    queryFn: async () => {
      const { data } = await apiClient.get<WorkoutSessionDetail>('/sessions/active');
      return data;
    },
    retry: false,
  });
}

export function useSessions(filters?: SessionFilters) {
  return useQuery({
    queryKey: [...sessionKeys.all, filters],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<WorkoutSession>>(
        '/sessions',
        { params: filters },
      );
      return data;
    },
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<WorkoutSessionDetail>(`/sessions/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useStartSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { splitId: string }) => {
      const { data } = await apiClient.post<WorkoutSessionDetail>(
        '/sessions/start',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.active });
    },
  });
}

export function useCompleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data } = await apiClient.post<WorkoutSession>(
        `/sessions/${id}/complete`,
        { notes },
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.active });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.detail(variables.id) });
    },
  });
}

export function useAbandonSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<WorkoutSession>(`/sessions/${id}/abandon`);
      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.active });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.detail(variables) });
    },
  });
}
