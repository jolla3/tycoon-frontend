// src/lib/api/banking.ts — routes/bank.routes.js (BANKING entitlement required)
//
// Lifecycle: create a BankConnection (bank-connections.ts) first, then register
// an account under an ACTIVE connection. Account lists are scoped server-side
// from the session; the frontend never sends clientId.
import { apiClient } from './client';
import type { BankAccount } from '@/types/api';

export interface RegisterBankAccountInput {
  estateId: string;
  connectionId: string;
  provider: 'COOP';
  accountNumber: string;
  accountName: string;
  currency?: string;
  /** Only send when the user has explicitly confirmed moving an already-registered account to another estate. */
  allowEstateReassignment?: boolean;
}

/** Statement import and sync return counts. They do not return transaction rows; use /transactions to read them. */
export interface SyncResult {
  stored: number;
  reconciled: number;
}

export const bankingApi = {
  list: () => apiClient.get<BankAccount[]>('/bank/accounts'),
  register: (input: RegisterBankAccountInput) => apiClient.post<BankAccount>('/bank/accounts', input),
  sync: (accountId: string) => apiClient.post<SyncResult>(`/bank/accounts/${accountId}/sync`),
  statement: (accountId: string, startDate: string, endDate: string) =>
    apiClient.get<SyncResult>(`/bank/accounts/${accountId}/statement`, { startDate, endDate }),
};
