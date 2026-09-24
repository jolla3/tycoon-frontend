// src/lib/api/auth.ts — maps 1:1 to routes/auth.routes.js (login, logout, me, refresh).
// No signup here on purpose: signup creates a brand-new Client + Owner and
// is a platform-admin operation, not part of the ordinary-user frontend
// (section 18 of the frontend spec).
import { apiClient } from './client';
import type { CurrentUser } from '@/types/api';

export const authApi = {
  login: (email: string, password: string) => apiClient.post<{ userId: string; role: string }>('/auth/login', { email, password }),
  logout: () => apiClient.post<Record<string, never>>('/auth/logout'),
  me: () => apiClient.get<CurrentUser>('/auth/me'),
  refresh: () => apiClient.post<Record<string, never>>('/auth/refresh'),
};
