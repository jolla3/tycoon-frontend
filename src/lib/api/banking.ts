// src/lib/api/banking.ts — routes/bank.routes.js
//
// NOTE: no estateId query param on list() — bank.service.js#list only
// takes (clientId, estateFilter), server-derived. See houses.ts for the
// identical pattern.
import { apiClient } from './client';
import type { BankAccount } from '@/types/api';

export interface ConnectBankAccountInput {
  estateId: string;
  provider: 'COOP' | 'KCB' | 'EQUITY' | 'NCBA';
  accountNumber: string;
  accountName: string;
  currency?: string;
}

export interface SyncResult {
  stored: number;
  reconciled: number;
}

export const bankingApi = {
  list: () => apiClient.get<BankAccount[]>('/bank/accounts'),
  connect: (input: ConnectBankAccountInput) => apiClient.post<BankAccount>('/bank/accounts', input),
  sync: (accountId: string) => apiClient.post<SyncResult>(`/bank/accounts/${accountId}/sync`),
  statement: (accountId: string, startDate: string, endDate: string) =>
    apiClient.get<SyncResult>(`/bank/accounts/${accountId}/statement`, { startDate, endDate }),
};
