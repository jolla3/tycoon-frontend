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
  CreateMpesaProfileInput,
  ClientMpesaProfile,
  MpesaCallbackConfig,
  MpesaCollectionReferenceRow,
  MpesaLifecycleInput,
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
  createMpesaProfile: (clientId: string, input: CreateMpesaProfileInput) =>
    apiClient.post<ClientMpesaProfile>(`/platform/clients/${clientId}/mpesa-profiles`, input),
  mpesaCallbackConfig: () => apiClient.get<MpesaCallbackConfig>('/platform/mpesa/callback-config'),
  getMpesaProfile: (clientId: string, profileId: string) =>
    apiClient.get<ClientMpesaProfile>(`/platform/clients/${clientId}/mpesa-profiles/${profileId}`),
  mapMpesaEstate: (clientId: string, profileId: string, estateId: string) =>
    apiClient.post<ClientMpesaProfile>(`/platform/clients/${clientId}/mpesa-profiles/${profileId}/estates`, { estateId }),
  unmapMpesaEstate: (clientId: string, profileId: string, estateId: string) =>
    apiClient.delete<ClientMpesaProfile>(`/platform/clients/${clientId}/mpesa-profiles/${profileId}/estates/${estateId}`),
  setMpesaPullNumber: (clientId: string, profileId: string, msisdn: string) =>
    apiClient.put<ClientMpesaProfile>(`/platform/clients/${clientId}/mpesa-profiles/${profileId}/pull-number`, { msisdn }),
  registerMpesa: (clientId: string, profileId: string, kind: 'c2b' | 'pull') =>
    apiClient.post<{ registrationState: string; configVersion: string }>(
      `/platform/clients/${clientId}/mpesa-profiles/${profileId}/registrations/${kind}`),
  reconcileMpesaRegistration: (clientId: string, profileId: string, kind: 'c2b' | 'pull', outcome: 'NOT_REGISTERED' | 'REGISTERED') =>
    apiClient.post<{ registrationState: string }>(
      `/platform/clients/${clientId}/mpesa-profiles/${profileId}/registrations/${kind}/reconcile`, { outcome }),
  // Explicit Superadmin lifecycle. The backend re-evaluates every condition on submit; the body
  // carries only the reviewed revision and a reason, never a state.
  activateMpesaProfile: (clientId: string, profileId: string, input: MpesaLifecycleInput) =>
    apiClient.post<ClientMpesaProfile>(`/platform/clients/${clientId}/mpesa-profiles/${profileId}/lifecycle/activate`, input),
  suspendMpesaProfile: (clientId: string, profileId: string, input: MpesaLifecycleInput & { reason: string }) =>
    apiClient.post<ClientMpesaProfile>(`/platform/clients/${clientId}/mpesa-profiles/${profileId}/lifecycle/suspend`, input),
  resumeMpesaProfile: (clientId: string, profileId: string, input: MpesaLifecycleInput) =>
    apiClient.post<ClientMpesaProfile>(`/platform/clients/${clientId}/mpesa-profiles/${profileId}/lifecycle/resume`, input),
  listMpesaReferences: (clientId: string, profileId: string, query: { page?: number; limit?: number; status?: 'ACTIVE' | 'RETIRED'; estateId?: string } = {}) =>
    apiClient.get<PageResult<MpesaCollectionReferenceRow>>(
      `/platform/clients/${clientId}/mpesa-profiles/${profileId}/references`, query as Record<string, QueryValue>),
  issueMpesaReference: (clientId: string, profileId: string, tenancyId: string) =>
    apiClient.post<MpesaCollectionReferenceRow>(`/platform/clients/${clientId}/mpesa-profiles/${profileId}/references`, { tenancyId }),
  retireMpesaReference: (clientId: string, profileId: string, referenceId: string) =>
    apiClient.delete<MpesaCollectionReferenceRow>(`/platform/clients/${clientId}/mpesa-profiles/${profileId}/references/${referenceId}`),
};
