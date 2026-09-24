// src/lib/api/platform.ts — maps to backend /api/v1/platform/* (SUPER_ADMIN only).
// Types mirror platform.service.js responses. No invented endpoints.

import { apiClient, type QueryValue } from './client';

export interface PlatformOverview {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  totalEstates: number;
  totalHouses: number;
  occupiedHouses: number;
  vacantHouses: number;
  totalTenants: number;
  activeTenants: number;
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  canceledSubscriptions: number;
}

export interface PlatformHealth {
  application: string;
  mongo: string;
  redis: string;
  redisLatencyMs: number | null;
  bankProvider: {
    name: string;
    configured: boolean;
    implemented: boolean;
    liveVerified: boolean;
  };
  smsProvider: {
    name: string;
    configured: boolean;
    implemented: boolean;
    liveVerified: boolean;
  };
  otherBankProviders: Array<{ name: string; implemented: boolean }>;
  backgroundJobs: {
    schedulerStartedAt?: string | null;
    multiInstanceSafe: boolean;
    intervalsMs?: Record<string, number>;
    jobs: Array<{
      name: string;
      status?: string;
      lastRunAt?: string | null;
      lastSuccessAt?: string | null;
      lastFailureAt?: string | null;
      lastError?: string | null;
      intervalMs?: number | null;
      nextScheduledRunAt?: string | null;
    }> | string[];
  };
}

export interface PlatformClientRow {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  owner?: { name?: string; email?: string; phone?: string; isActive?: boolean } | null;
  estateCount: number;
  houseCount: number;
}

export interface PlatformClientDetail extends PlatformClientRow {
  subscription?: { plan?: string; status?: string; startDate?: string } | null;
  activeTenantCount?: number;
  staffCount?: number;
}

export interface ProvisionClientInput {
  clientName: string;
  ownerName: string;
  email: string;
  phone?: string;
  password: string;
  plan?: 'trial' | 'basic' | 'pro';
}

export interface ProvisionClientResult {
  client: { id: string; name: string; isActive: boolean };
  owner: { id: string; name: string; email: string; phone?: string; role: string };
}

export interface PlatformUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  phone?: string;
  lastLoginAt?: string;
  createdAt?: string;
  client?: { id: string; name: string; isActive?: boolean } | null;
}

export interface PlatformAuditRow {
  _id: string;
  action: string;
  resource?: string;
  resourceId?: string;
  clientId?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  userId?: { name?: string; email?: string; role?: string } | null;
}

export interface PlatformSubscriptionRow {
  _id: string;
  plan?: string;
  status?: string;
  startDate?: string;
  clientId?: { _id?: string; name?: string; isActive?: boolean } | string | null;
  createdAt?: string;
}

interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export const platformApi = {
  overview: () => apiClient.get<PlatformOverview>('/platform/overview'),
  health: () => apiClient.get<PlatformHealth>('/platform/health'),
  listClients: (query: { page?: number; limit?: number; isActive?: boolean } = {}) =>
    apiClient.get<PageResult<PlatformClientRow>>('/platform/clients', query as Record<string, QueryValue>),
  getClient: (clientId: string) => apiClient.get<PlatformClientDetail>(`/platform/clients/${clientId}`),
  provisionClient: (input: ProvisionClientInput) =>
    apiClient.post<ProvisionClientResult>('/platform/clients', input),
  updateClient: (clientId: string, updates: { name?: string }) =>
    apiClient.patch<PlatformClientRow>(`/platform/clients/${clientId}`, updates),
  activateClient: (clientId: string) => apiClient.post<PlatformClientRow>(`/platform/clients/${clientId}/activate`),
  deactivateClient: (clientId: string) => apiClient.post<PlatformClientRow>(`/platform/clients/${clientId}/deactivate`),
  listUsers: (query: { page?: number; limit?: number; role?: string; clientId?: string; isActive?: boolean } = {}) =>
    apiClient.get<PageResult<PlatformUserRow>>('/platform/users', query as Record<string, QueryValue>),
  listAudit: (query: { page?: number; limit?: number; action?: string; clientId?: string } = {}) =>
    apiClient.get<PageResult<PlatformAuditRow>>('/platform/audit', query as Record<string, QueryValue>),
  listSubscriptions: (query: { page?: number; limit?: number; status?: string } = {}) =>
    apiClient.get<PageResult<PlatformSubscriptionRow>>('/platform/subscriptions', query as Record<string, QueryValue>),
};
