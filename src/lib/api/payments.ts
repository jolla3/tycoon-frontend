import { apiClient, type QueryValue } from './client';
import type { Paginated, Payment } from '@/types/api';

export type TenderMethod = 'CASH' | 'MPESA' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';

export interface ManualPaymentInput {
  houseId: string;
  amountCents: number;
  paymentDate: string;
  tenderMethod: TenderMethod;
  paymentReference?: string;
  /** Edge-case / legacy — ordinary UI does not send these. */
  period?: string;
  tenantId?: string;
  tenancyId?: string;
}

/** One selectable tenancy. Kept for legacy manual-options consumers. */
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

/** GET /payments/manual-options (legacy / edge-case). */
export interface ManualPaymentOptions {
  houseId: string;
  period: string;
  resolution: 'UNIQUE' | 'AMBIGUOUS' | 'NONE';
  defaultTenancyId: string | null;
  eligibleTotal?: number;
  eligibleSelection?: EligibleSelection;
  options: TenancyOption[];
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

/** GET /payments/manual-context — occupancy + tenant balance for the record form. */
export interface ManualPaymentContext {
  houseId: string;
  houseNumber: string;
  houseStatus: string;
  isActive: boolean;
  paymentDate: string;
  occupancy: {
    ok: boolean;
    reason: string | null;
    tenancyId: string | null;
    tenantId: string | null;
  };
  tenant: { _id: string; name: string; phone?: string; status?: string } | null;
  /** Tenant ledger balance in cents; null when unavailable (never treat as 0). */
  tenantBalanceCents: number | null;
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
  tenantId?: string | null;
  unappliedCents?: number;
  remainingBalanceCents?: number | null;
  balanceBeforeCents?: number | null;
  balanceAfterCents?: number | null;
  tenant?: { _id: string; name: string; phone?: string } | null;
}

export const paymentsApi = {
  list: (query: { page?: number; limit?: number; houseId?: string; tenantId?: string; estateId?: string } = {}) =>
    apiClient.get<Paginated<Payment>>('/payments', query as Record<string, QueryValue>),
  manualOptions: (query: {
    houseId: string; period?: string; page?: number; limit?: number; search?: string;
    eligiblePage?: number; eligibleLimit?: number; eligibleSearch?: string;
  }) =>
    apiClient.get<ManualPaymentOptions>('/payments/manual-options', query as Record<string, QueryValue>),
  manualContext: (query: { houseId: string; paymentDate?: string }) =>
    apiClient.get<ManualPaymentContext>('/payments/manual-context', query as Record<string, QueryValue>),
  create: (input: ManualPaymentInput) => apiClient.post<ManualPaymentResult>('/payments', input),
};
