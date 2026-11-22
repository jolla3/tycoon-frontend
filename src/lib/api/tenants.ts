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
 * Charge-based account totals are separate from ledger-known arrears.
 * outstandingCents is the estate-scoped open RentCharge balance.
 * knownArrearsCents (from KnownArrears) is a nullable ledger lower bound.
 * Never substitute one figure for the other.
 */
export interface TenantFinancials extends KnownArrears {
  billedCents: number;
  paidCents: number;
  outstandingCents: number;
  /** Open charges past their due date. Charge-based, independent of the ledger figure. */
  overdueCents: number;
  oldestUnpaidPeriod: string | null;
  currentPeriod: string;
}

/**
 * Four distinct concepts — never interchangeable:
 * received (gross money in), appliedToRent (allocated to charges), credit (available), outstanding (owed).
 */
export interface TenantAccount {
  receivedCents: number;
  billedCents: number;
  appliedToRentCents: number;
  appliedFromCreditCents: number;
  creditCents: number;
  outstandingCents: number;
  netCents: number;
}

export interface TenantPaymentHistoryRow {
  kind: 'manual_receipt' | 'payment' | 'mpesa_surplus';
  id: string;
  origin: string;
  status: string;
  paymentDate: string;
  paymentDateLocal: string | null;
  reference: string | null;
  tenderMethod: string | null;
  houseId: string | null;
  houseNumber: string | null;
  tenancyId: string | null;
  grossCents: number;
  appliedToRentCents: number;
  appliedFromCreditCents: number;
  newCreditCents: number;
}

export interface TenantDetail extends Tenant {
  account?: TenantAccount;
  paymentHistory?: TenantPaymentHistoryRow[];
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
