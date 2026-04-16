import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { AdminDashboard, ActiveHoursData, LlmUsageData, AdminUsersData } from '@/types';

export const adminKeys = {
  dashboard: ['admin', 'dashboard'] as const,
  activeHours: (days: number) => ['admin', 'active-hours', days] as const,
  llmUsage: (days: number) => ['admin', 'llm-usage', days] as const,
  users: (page: number, search: string) => ['admin', 'users', page, search] as const,
};

export function useAdminDashboard() {
  return useQuery({
    queryKey: adminKeys.dashboard,
    queryFn: async () => {
      const { data } = await apiClient.get<AdminDashboard>('/admin/dashboard');
      return data;
    },
    staleTime: 60 * 1000,
  });
}

export function useAdminActiveHours(days = 30) {
  return useQuery({
    queryKey: adminKeys.activeHours(days),
    queryFn: async () => {
      const { data } = await apiClient.get<ActiveHoursData>('/admin/active-hours', {
        params: { days },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminLlmUsage(days = 30) {
  return useQuery({
    queryKey: adminKeys.llmUsage(days),
    queryFn: async () => {
      const { data } = await apiClient.get<LlmUsageData>('/admin/llm-usage', {
        params: { days },
      });
      return data;
    },
    staleTime: 60 * 1000,
  });
}

export function useAdminUsers(page = 1, search = '') {
  return useQuery({
    queryKey: adminKeys.users(page, search),
    queryFn: async () => {
      const { data } = await apiClient.get<AdminUsersData>('/admin/users', {
        params: { page, pageSize: 20, search: search || undefined },
      });
      return data;
    },
    staleTime: 30 * 1000,
  });
}
