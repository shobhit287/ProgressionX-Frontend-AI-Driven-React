// Single local user — no login. `useCurrentUser` reads the profile row;
// `useUpdateProfile` writes it. Hook names kept so the pages don't change.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as local from '@/local/profile';

export const authKeys = {
  currentUser: ['auth', 'me'] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: () => local.getProfile(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      firstName?: string;
      lastName?: string;
      email?: string;
      age?: number;
      weight?: number;
      height?: number;
      goal?: 'bulking' | 'cutting' | 'maintenance';
      gender?: 'male' | 'female' | 'other';
      trainingType?: string;
      experienceLevel?: string;
      activityLevel?: string;
    }) => local.updateProfile(payload as local.ProfileInput),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.currentUser, data);
    },
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: local.ProfileInput) => local.createProfile(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.currentUser, data);
    },
  });
}
