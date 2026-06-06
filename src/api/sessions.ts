import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type {
  PaginatedResponse,
  SessionDateItem,
  WorkoutSession,
  WorkoutSessionDetail,
} from '@/types';

export const sessionKeys = {
  all: ['sessions'] as const,
  active: ['sessions', 'active'] as const,
  detail: (id: string) => ['sessions', id] as const,
  datesBySplit: (splitId: string) => ['sessions', 'dates', splitId] as const,
  previous: (id: string) => ['sessions', id, 'previous'] as const,
};

interface SessionFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  splitId?: string;
  fromDate?: string;
  toDate?: string;
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

export function useSessions(filters?: SessionFilters | null) {
  return useQuery({
    queryKey: [...sessionKeys.all, filters],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<WorkoutSession>>(
        '/sessions',
        { params: filters ?? undefined },
      );
      return data;
    },
    enabled: filters !== undefined && filters !== null,
  });
}

export function useSessionDatesBySplit(splitId: string, limit = 500) {
  return useQuery({
    queryKey: sessionKeys.datesBySplit(splitId),
    queryFn: async () => {
      const { data } = await apiClient.get<SessionDateItem[]>('/sessions/dates', {
        params: { splitId, limit },
      });
      return data;
    },
    enabled: !!splitId,
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

/** Most recent completed session for the same split as `id`. Null when
 *  there's no prior session for that split (first-time user). */
export function usePreviousSession(id: string) {
  return useQuery({
    queryKey: sessionKeys.previous(id),
    queryFn: async () => {
      const { data } = await apiClient.get<WorkoutSessionDetail | null>(
        `/sessions/${id}/previous-session`,
      );
      return data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
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

/** Log a workout the user did on a past day but never recorded. Creates a
 *  COMPLETED session for the given date, seeded with the split's exercises
 *  but no sets — the caller then navigates the user into the active-session
 *  page in edit mode to fill them in. */
export function useBackfillSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { splitId: string; date: string }) => {
      const { data } = await apiClient.post<WorkoutSessionDetail>(
        '/sessions/backfill',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

export function useCompleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data } = await apiClient.patch<WorkoutSession>(
        `/sessions/${id}/complete`,
        notes ? { notes } : undefined,
      );
      return data;
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
        queryClient.invalidateQueries({ queryKey: sessionKeys.active }),
        queryClient.invalidateQueries({ queryKey: sessionKeys.detail(variables.id) }),
      ]);
    },
  });
}

export function useAbandonSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<WorkoutSession>(`/sessions/${id}/abandon`);
      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.active });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.detail(variables) });
    },
  });
}

/** Restore a same-day session to in-progress after an accidental
 *  abandon / complete. Backend enforces the same-day + single-active
 *  guards. */
export function useReopenSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<WorkoutSession>(`/sessions/${id}/reopen`);
      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.active });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.detail(variables) });
    },
  });
}
