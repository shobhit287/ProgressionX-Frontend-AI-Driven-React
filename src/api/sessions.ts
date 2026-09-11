import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as local from '@/local/sessions';

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
    queryFn: () => local.getActiveSession(),
    retry: false,
  });
}

export function useSessions(filters?: SessionFilters | null) {
  return useQuery({
    queryKey: [...sessionKeys.all, filters],
    queryFn: () => local.listSessions(filters ?? {}),
    enabled: filters !== undefined && filters !== null,
  });
}

export function useSessionDatesBySplit(splitId: string, limit = 500) {
  return useQuery({
    queryKey: sessionKeys.datesBySplit(splitId),
    queryFn: () => local.sessionDatesBySplit(splitId, limit),
    enabled: !!splitId,
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: () => local.getSession(id),
    enabled: !!id,
  });
}

/** Most recent completed session for the same split as `id`. Null when
 *  there's no prior session for that split (first-time user). */
export function usePreviousSession(id: string) {
  return useQuery({
    queryKey: sessionKeys.previous(id),
    queryFn: () => local.getPreviousSession(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStartSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { splitId: string }) => local.startSession(payload.splitId),
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
    mutationFn: (payload: { splitId: string; date: string }) =>
      local.backfillSession(payload.splitId, payload.date),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

export function useCompleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      local.completeSession(id, notes || undefined),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
        queryClient.invalidateQueries({ queryKey: sessionKeys.active }),
        queryClient.invalidateQueries({ queryKey: sessionKeys.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: ['analytics'] }),
      ]);
    },
  });
}

export function useAbandonSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => local.abandonSession(id),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.active });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.detail(variables) });
    },
  });
}

/** Restore a same-day session to in-progress after an accidental
 *  abandon / complete. Same-day + single-active guards are enforced in
 *  the local service. */
export function useReopenSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => local.reopenSession(id),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.active });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.detail(variables) });
      void queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
