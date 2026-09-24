// src/lib/api/staff.ts — routes/user.routes.js
import { apiClient } from './client';
import type { Role, StaffUser } from '@/types/api';

export interface CreateStaffInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: Extract<Role, 'STAFF' | 'CLIENT_ADMIN'>;
  estateIds?: string[];
}

/** updateStaff schema: name/phone/estateIds only */
export interface UpdateStaffInput {
  name?: string;
  phone?: string;
  estateIds?: string[];
}

export const staffApi = {
  list: () => apiClient.get<StaffUser[]>('/users'),
  create: (input: CreateStaffInput) => apiClient.post<{ userId: string }>('/users', input),
  update: (id: string, updates: UpdateStaffInput) => apiClient.patch<StaffUser>(`/users/${id}`, updates),
  deactivate: (id: string) => apiClient.post<StaffUser>(`/users/${id}/deactivate`),
  activate: (id: string) => apiClient.post<StaffUser>(`/users/${id}/activate`),
};
