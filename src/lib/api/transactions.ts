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

/**
 * Defense in depth ONLY. The wire response still contains processingClaimToken
 * and rawPayload until the backend projects a safe DTO (see matrix 18.1). This
 * copies just the displayed fields so the sensitive values are not retained in
 * React state, the query cache or the IndexedDB snapshot. It does not make the
 * endpoint safe.
 */
function toSafe(t: BankTransaction): BankTransaction {
  return {
    _id: t._id,
    clientId: t.clientId,
    estateId: t.estateId,
    bankAccountId: t.bankAccountId,
    provider: t.provider,
    providerTransactionId: t.providerTransactionId,
    amountCents: t.amountCents,
    currency: t.currency,
    transactionDate: t.transactionDate,
    paymentReference: t.paymentReference,
    narration: t.narration,
    eventType: t.eventType,
    matchedHouseId: t.matchedHouseId,
    matchedTenantId: t.matchedTenantId,
    matchStatus: t.matchStatus,
    processingState: t.processingState,
  };
}

export const transactionsApi = {
  list: async (query: TransactionListQuery = {}) => {
    const page = await apiClient.get<Paginated<BankTransaction>>('/transactions', query as Record<string, QueryValue>);
    return { ...page, items: page.items.map(toSafe) };
  },
  unmatched: async (estateId?: string) => {
    const rows = await apiClient.get<BankTransaction[]>('/transactions/unmatched', estateId ? { estateId } : undefined);
    return rows.map(toSafe);
  },
  assign: (transactionId: string, houseId: string) =>
    apiClient.post<BankTransaction>(`/transactions/${transactionId}/assign`, { houseId }),
};
