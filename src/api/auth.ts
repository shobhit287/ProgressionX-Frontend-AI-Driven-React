import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/auth';
import type { TokenResponse, User } from '@/types';

export const authKeys = {
  currentUser: ['auth', 'me'] as const,
};

interface LoginPayload {
  email: string;
  password: string;
}

interface SignupPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  age: number;
  weight: number;
  height: number;
  goal: 'bulking' | 'cutting' | 'maintenance';
  gender: 'male' | 'female' | 'other';
  mobileNumber?: string;
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await apiClient.post<TokenResponse>('/auth/login', payload);
      return data;
    },
    onSuccess: async (data) => {
      const { data: user } = await apiClient.get<User>('/users/me', {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      setAuth(data.accessToken, data.refreshToken, user);
    },
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: async (payload: SignupPayload) => {
      const { data } = await apiClient.post<User>('/users', payload);
      return data;
    },
  });
}

export function useCurrentUser() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: async () => {
      const { data } = await apiClient.get<User>('/users/me');
      setUser(data);
      return data;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}
