// src/lib/api/bank-connections.ts — routes/connection.routes.js (BANKING entitlement required)
//
// Credential material is request-only. It is never returned by the backend, so
// it must never be stored in React Query state, IndexedDB, logs or telemetry.
// Callers pass it straight into a mutation and discard it.
import { apiClient } from './client';
import type { BankConnectionStatus } from './platform/types';

/** Co-operative Bank is the only provider the backend operates. */
export type BankProviderId = 'COOP';

/**
 * Co-op Connect credential contract: Consumer Key + Consumer Secret ONLY.
 * The backend rejects any other field (no client id/secret pair, username,
 * password, scope, PIN or OTP). Grant/scope/token details are trusted platform
 * configuration, never user input. BankConnection.clientId stays the Tycoon
 * owner Client ID and is unrelated to the Consumer Key.
 */
export interface CoopCredentialMaterial {
  consumerKey: string;
  consumerSecret: string;
}

/** Whitelist-copy so no extra property can ever ride along in the request body. */
export function toCoopCredentialBody(m: CoopCredentialMaterial): CoopCredentialMaterial {
  return { consumerKey: m.consumerKey.trim(), consumerSecret: m.consumerSecret.trim() };
}

export interface BankConnection {
  id: string;
  clientId: string;
  provider: BankProviderId;
  displayName: string | null;
  status: BankConnectionStatus;
  credentialVersion: number;
  authMeta: {
    tokenExpiresAt: string | null;
    lastAuthAt: string | null;
    lastAuthError: string | null;
    externalClientId: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankConnectionInput {
  provider: BankProviderId;
  displayName?: string;
  credentialMaterial: CoopCredentialMaterial;
}

export const bankConnectionsApi = {
  list: (clientId?: string) => apiClient.get<BankConnection[]>('/bank/connections', clientId ? { clientId } : undefined),
  get: (id: string, clientId?: string) => apiClient.get<BankConnection>(`/bank/connections/${id}`, clientId ? { clientId } : undefined),
  create: (input: CreateBankConnectionInput, clientId?: string) =>
    apiClient.post<BankConnection>(
      `/bank/connections${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ''}`,
      { ...input, credentialMaterial: toCoopCredentialBody(input.credentialMaterial) }
    ),
  reauthorize: (id: string, credentialMaterial: CoopCredentialMaterial, clientId?: string) =>
    apiClient.post<BankConnection>(`/bank/connections/${id}/reauthorize${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ''}`, { credentialMaterial: toCoopCredentialBody(credentialMaterial) }),
  disconnect: (id: string, clientId?: string) =>
    apiClient.post<BankConnection>(`/bank/connections/${id}/disconnect${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ''}`),
};
