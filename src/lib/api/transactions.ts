// src/lib/api/transactions.ts — routes/transaction.routes.js
//
// NOTE: no estateId query param on either list() or unmatched() —
// transaction.service.js only reads matchStatus/startDate/endDate/page/limit
// from the query string; estate scoping is server-derived from
// req.estateFilter. Estate narrowing beyond that is applied client-side.
import { apiClient, type QueryValue } from './client';
import type { BankTransaction, Paginated } from '@/types/api';

export interface TransactionListQuery {
  matchStatus?: 'MATCHED' | 'UNMATCHED';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const transactionsApi = {
  list: (query: TransactionListQuery = {}) => apiClient.get<Paginated<BankTransaction>>('/transactions', query as Record<string, QueryValue>),
  unmatched: () => apiClient.get<BankTransaction[]>('/transactions/unmatched'),
  assign: (transactionId: string, houseId: string) =>
    apiClient.post<BankTransaction>(`/transactions/${transactionId}/assign`, { houseId }),
};
