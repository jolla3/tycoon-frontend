// src/lib/api/profile.ts — routes/profile.routes.js
import { apiClient } from './client';
import type { CurrentUser } from '@/types/api';

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
}

export const profileApi = {
  get: () => apiClient.get<CurrentUser>('/profile'),
  update: (input: UpdateProfileInput) => apiClient.patch<Pick<CurrentUser, 'name' | 'email' | 'phone'>>('/profile', input),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post<Record<string, never>>('/profile/change-password', { currentPassword, newPassword }),
};
