import { apiClient } from './client';
import type { Tenant } from '@/types/api';

export interface CreateTenantInput {
  name: string;
  phone: string;
  houseId: string;
  moveInDate?: string;
}

export interface TenantMonthlyRow {
  period: string;
  billedCents: number;
  paidCents: number;
  outstandingCents: number;
}

export interface TenantDetail extends Tenant {
  house?: { _id: string; houseNumber: string; status?: string; houseTypeId?: string } | null;
  estate?: { _id: string; name: string; address?: string } | null;
  financials?: {
    billedCents: number;
    paidCents: number;
    outstandingCents: number;
    overdueCents?: number;
    oldestUnpaidPeriod?: string | null;
    currentPeriod: string;
    /** Authoritative source: ledger | rentcharge_fallback | empty */
    balanceSource?: string;
  };
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
  payments?: Array<{
    _id: string;
    amountCents: number;
    paymentDate: string;
    paymentReference?: string;
    period?: string;
    houseId?: string;
    status?: string;
  }>;
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
  list: () => apiClient.get<Tenant[]>('/tenants'),
  get: (id: string) => apiClient.get<TenantDetail>(`/tenants/${id}`),
  create: (input: CreateTenantInput) => apiClient.post<Tenant>('/tenants', input),
  update: (id: string, updates: Partial<CreateTenantInput> & { status?: string; moveOutDate?: string }) =>
    apiClient.patch<Tenant>(`/tenants/${id}`, updates),
  move: (id: string, houseId: string) => apiClient.post<Tenant>(`/tenants/${id}/move`, { houseId }),
};
