// src/lib/api/transactions.ts — routes/transaction.routes.js (BANKING entitlement required)
//
// estateId is accepted by clientContext and enforced server-side (a restricted
// user's allowed set always applies). It is part of every query key.
//
// BACKEND PREREQUISITE: list/unmatched currently return raw BankTransaction
// documents. The browser type below models only the safe fields; the backend
// must project a DTO that omits processingClaimToken and rawPayload.
import { apiClient, type QueryValue } from './client';
import type { BankTransaction, MatchStatus, Paginated } from '@/types/api';

export interface TransactionListQuery {
  estateId?: string;
  matchStatus?: MatchStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const transactionsApi = {
  list: (query: TransactionListQuery = {}) => apiClient.get<Paginated<BankTransaction>>('/transactions', query as Record<string, QueryValue>),
  unmatched: (estateId?: string) => apiClient.get<BankTransaction[]>('/transactions/unmatched', estateId ? { estateId } : undefined),
  assign: (transactionId: string, houseId: string) =>
    apiClient.post<BankTransaction>(`/transactions/${transactionId}/assign`, { houseId }),
};
