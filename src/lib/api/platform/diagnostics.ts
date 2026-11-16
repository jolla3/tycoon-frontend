import { apiClient } from '../client';
import type { ClientDiagnostics } from './types';

/** Read-only. Works for inactive clients. This is not impersonation. */
export const diagnosticsApi = {
  get: (clientId: string) => apiClient.get<ClientDiagnostics>(`/platform/clients/${clientId}/diagnostics`),
};
