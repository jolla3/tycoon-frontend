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

export const mpesaTransactionsApi = {
  list: (query: MpesaTransactionQuery = {}) =>
    apiClient.get<Paginated<MpesaTransactionRow>>('/mpesa-transactions', query as Record<string, QueryValue>),
};
