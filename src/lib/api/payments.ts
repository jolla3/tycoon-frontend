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

/** GET /payments/manual-options */
export interface ManualPaymentOptions {
  houseId: string;
  period: string;
  resolution: 'UNIQUE' | 'AMBIGUOUS' | 'NONE';
  defaultTenancyId: string | null;
  /** Every tenancy that covers the period, independent of paging/search (older records included). */
  eligibleOptions?: TenancyOption[];
  /** Exact count of tenancies that cover the period (eligibleOptions is a display-bounded sample of them). */
  eligibleTotal?: number;
  /** One page of the house's tenancies (newest first), optionally filtered by tenant name. */
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
  manualOptions: (query: { houseId: string; period?: string; page?: number; limit?: number; search?: string }) =>
    apiClient.get<ManualPaymentOptions>('/payments/manual-options', query as Record<string, QueryValue>),
  create: (input: ManualPaymentInput) => apiClient.post<ManualPaymentResult>('/payments', input),
};
