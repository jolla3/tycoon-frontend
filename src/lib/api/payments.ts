import { apiClient, type QueryValue } from './client';
import type { Paginated, Payment } from '@/types/api';

export interface ManualPaymentInput {
  houseId: string;
  amountCents: number;
  paymentDate?: string;
  paymentReference?: string;
  period?: string;
  tenantId?: string;
  /** Validated server-side against client/estate/house/tenant/period. */
  tenancyId?: string;
}

/** One selectable tenancy. `tenancyId` is a value only; show tenantName and dates. */
export interface TenancyOption {
  tenancyId: string;
  tenantName: string;
  startAt: string;
  endAt: string | null;
  status: 'ACTIVE' | 'CLOSED';
  coversPeriod: boolean;
  reason: string | null;
}

export interface EligibleSelection {
  items: TenancyOption[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  search: string;
}

/** GET /payments/manual-options */
export interface ManualPaymentOptions {
  houseId: string;
  period: string;
  resolution: 'UNIQUE' | 'AMBIGUOUS' | 'NONE';
  defaultTenancyId: string | null;
  /** Exact number of tenancies that fully cover the period; independent of page and search. */
  eligibleTotal?: number;
  /**
   * The ONLY selectable list: eligible tenancies, newest first, paginated and searched by tenant
   * name in the database. `total` is the exact count for the current search.
   */
  eligibleSelection?: EligibleSelection;
  /** INFORMATIONAL history (all statuses/eligibility). Explains NONE; never selectable. */
  options: TenancyOption[];
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

export interface ManualPaymentResult {
  payment: Payment;
  allocations: Array<{
    rentChargeId: string;
    amountCents: number;
    chargeType: string;
    period: string;
  }>;
  reused?: boolean;
  tenancyId?: string | null;
  unappliedCents?: number;
  remainingBalanceCents?: number | null;
}

export const paymentsApi = {
  list: (query: { page?: number; limit?: number; houseId?: string; tenantId?: string; estateId?: string } = {}) =>
    apiClient.get<Paginated<Payment>>('/payments', query as Record<string, QueryValue>),
  manualOptions: (query: {
    houseId: string; period?: string; page?: number; limit?: number; search?: string;
    eligiblePage?: number; eligibleLimit?: number; eligibleSearch?: string;
  }) =>
    apiClient.get<ManualPaymentOptions>('/payments/manual-options', query as Record<string, QueryValue>),
  create: (input: ManualPaymentInput) => apiClient.post<ManualPaymentResult>('/payments', input),
};
