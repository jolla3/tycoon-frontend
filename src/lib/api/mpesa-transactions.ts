import { apiClient, type QueryValue } from './client';
import type { Paginated } from '@/types/api';

export type MpesaVerificationState = 'UNVERIFIED' | 'MATCHED' | 'CONFLICT' | 'MANUAL_REVIEW';
export type MpesaPostingState = 'NOT_POSTED' | 'PROCESSING' | 'POSTED' | 'FAILED_RETRYABLE' | 'FAILED_TERMINAL';

export type MpesaAllocationState = 'UNALLOCATED' | 'ALLOCATED_BY_REFERENCE' | 'ALLOCATED_BY_EVIDENCE';

export interface MpesaTransactionRow {
  id: string;
  merchantProfileId: string | null;
  businessShortCode: string;
  receiptNumber: string;
  amountCents: number;
  currency: string;
  transactionAt: string;
  billRefNumber: string | null;
  transactionType: string | null;
  sourceChannels: string[];
  verificationState: MpesaVerificationState;
  conflictReason: string | null;
  claimState: 'UNCLAIMED' | 'CLAIMED' | 'REVIEW' | 'REJECTED';
  postingState: MpesaPostingState;
  postedAt: string | null;
  attributedEstateId: string | null;
  /** Routing state only: UNALLOCATED is NOT a posted rent payment. */
  allocationState: MpesaAllocationState;
  allocationReason: string | null;
  allocatedEstateId: string | null;
  createdAt: string;
}

export interface MpesaTransactionQuery {
  estateId?: string;
  page?: number;
  limit?: number;
  verificationState?: MpesaVerificationState;
  postingState?: MpesaPostingState;
  allocationState?: MpesaAllocationState;
  businessShortCode?: string;
  startDate?: string;
  endDate?: string;
}

export interface SummaryBucket { count: number; amountCents: number }
export type MpesaSummaryState = 'POSTED' | 'QUARANTINED' | 'UNALLOCATED' | 'ATTRIBUTED';

/**
 * GET /mpesa-transactions/summary. Every receipt is in exactly ONE `states`
 * bucket, so the buckets sum to `providerObserved`. `verification` is a second
 * breakdown of the same receipts, not extra money. No raw payload is returned.
 */
export interface MpesaSummary {
  window: { startDate: string; endDate: string };
  scope: 'CLIENT_WIDE' | 'ESTATE_RESTRICTED';
  providerObserved: SummaryBucket;
  states: Record<MpesaSummaryState, SummaryBucket>;
  verification: Record<MpesaVerificationState, SummaryBucket>;
  posted: { receiptCount: number; paymentCount: number; amountCents: number; creditEarnedCents: number };
  byEstate: Array<{ estateId: string | null; providerObserved: SummaryBucket; states: Record<MpesaSummaryState, SummaryBucket> }>;
}

export const mpesaTransactionsApi = {
  summary: (query: { startDate: string; endDate: string; estateId?: string }) =>
    apiClient.get<MpesaSummary>('/mpesa-transactions/summary', query as Record<string, QueryValue>),
  list: (query: MpesaTransactionQuery = {}) =>
    apiClient.get<Paginated<MpesaTransactionRow>>('/mpesa-transactions', query as Record<string, QueryValue>),
};
