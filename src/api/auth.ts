import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  trainingType?: string;
  experienceLevel?: string;
  activityLevel?: string;
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

/** POSTs the Google ID token ("credential") to the backend and stores the
 *  resulting JWT pair. Returns the TokenResponse so the caller can route
 *  based on `isProfileComplete`. */
export function useGoogleLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async (credential: string) => {
      const { data } = await apiClient.post<TokenResponse>('/auth/google', {
        credential,
      });
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

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: async (payload: {
      firstName?: string;
      lastName?: string;
      age?: number;
      weight?: number;
      height?: number;
      goal?: 'bulking' | 'cutting' | 'maintenance';
      gender?: 'male' | 'female' | 'other';
      trainingType?: string;
      experienceLevel?: string;
      activityLevel?: string;
    }) => {
      const { data } = await apiClient.patch<User>('/users', payload);
      return data;
    },
    onSuccess: (data) => {
      setUser(data);
      // Write the fresh user into the query cache synchronously. If we only
      // invalidate, AuthGuard reads the stale cached user (isProfileComplete
      // still false) for one render and bounces the user back to
      // /profile/complete, which remounts the form and wipes the inputs.
      queryClient.setQueryData(authKeys.currentUser, data);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: { oldPassword: string; newPassword: string }) => {
      const { data } = await apiClient.post<{ message: string }>(
        '/users/change-password',
        payload,
      );
      return data;
    },
  });
}
