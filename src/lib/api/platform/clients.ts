import { apiClient, type QueryValue } from '../client';
import type {
  ClientListFilters,
  PageResult,
  PlatformClientDetail,
  PlatformClientRow,
  PlatformSubscription,
  ProvisionClientInput,
  ProvisionClientResult,
  UpdateClientSubscriptionInput,
} from './types';

export const clientsApi = {
  list: (filters: ClientListFilters = {}) =>
    apiClient.get<PageResult<PlatformClientRow>>('/platform/clients', filters as Record<string, QueryValue>),
  get: (clientId: string) => apiClient.get<PlatformClientDetail>(`/platform/clients/${clientId}`),
  provision: (input: ProvisionClientInput) => apiClient.post<ProvisionClientResult>('/platform/clients', input),
  update: (clientId: string, updates: { name?: string }) =>
    apiClient.patch<PlatformClientRow>(`/platform/clients/${clientId}`, updates),
  activate: (clientId: string) => apiClient.post<PlatformClientRow>(`/platform/clients/${clientId}/activate`),
  deactivate: (clientId: string) => apiClient.post<PlatformClientRow>(`/platform/clients/${clientId}/deactivate`),
  /** Updates an EXISTING subscription only; the backend cannot create a missing one. */
  updateSubscription: (clientId: string, updates: UpdateClientSubscriptionInput) =>
    apiClient.patch<PlatformSubscription>(`/platform/clients/${clientId}/subscription`, updates),
};
