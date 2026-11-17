import { apiClient, type QueryValue } from './client';
import type { Payment, PaymentStatus, Tenant } from '@/types/api';
import type { KnownArrears } from '@/types/financial';

export interface CreateTenantInput {
  name: string;
  phone: string;
  houseId: string;
  moveInDate?: string;
}

/** PATCH accepts these fields only. Moving a tenant uses the dedicated move route. */
export interface UpdateTenantInput {
  name?: string;
  phone?: string;
  status?: string;
  moveOutDate?: string;
}

export interface TenantListQuery {
  estateId?: string;
}

/** Open-charge totals per period. Not a ledger balance. */
export interface TenantMonthlyRow {
  period: string;
  billedCents: number;
  paidCents: number;
  outstandingCents: number;
}

/**
 * `outstandingCents` mirrors `knownArrearsCents` and is null when the ledger
 * cannot provide a figure. It is a known-arrears lower bound unless
 * `verifiedFullObligation` is true. Render via describeKnownArrears().
 */
export interface TenantFinancials extends KnownArrears {
  billedCents: number;
  paidCents: number;
  outstandingCents: number | null;
  /** Open charges past their due date. Charge-based, independent of the ledger figure. */
  overdueCents: number;
  oldestUnpaidPeriod: string | null;
  currentPeriod: string;
}

export interface TenantDetail extends Tenant {
  house?: { _id: string; houseNumber: string; status?: string; houseTypeId?: string } | null;
  estate?: { _id: string; name: string; address?: string } | null;
  financials?: TenantFinancials;
  monthly?: TenantMonthlyRow[];
  billingHistory?: Array<{
    _id: string;
    period: string;
    chargeType: string;
    amountDueCents: number;
    amountPaidCents: number;
    balanceCents: number;
    status: string;
  }>;
  /** May include REVERSED rows. Reversed payments are not collected money. */
  payments?: Array<Pick<Payment, '_id' | 'amountCents' | 'paymentDate' | 'paymentReference' | 'period' | 'houseId'> & { status: PaymentStatus }>;
  smsHistory?: Array<{
    _id: string;
    phoneNumber: string;
    message: string;
    status: string;
    type?: string;
    createdAt?: string;
    sentAt?: string;
  }>;
  activity?: Array<{ action: string; description?: string; createdAt?: string }>;
}

export const tenantsApi = {
  /** Unpaginated on the backend. estateId narrows server-side; a restricted user is always limited to their allowed estates. */
  list: (query: TenantListQuery = {}) => apiClient.get<Tenant[]>('/tenants', query as Record<string, QueryValue>),
  get: (id: string) => apiClient.get<TenantDetail>(`/tenants/${id}`),
  create: (input: CreateTenantInput) => apiClient.post<Tenant>('/tenants', input),
  update: (id: string, updates: UpdateTenantInput) => apiClient.patch<Tenant>(`/tenants/${id}`, updates),
  move: (id: string, houseId: string) => apiClient.post<Tenant>(`/tenants/${id}/move`, { houseId }),
};
