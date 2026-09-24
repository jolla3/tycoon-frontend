import { apiClient, type QueryValue } from './client';
import type { Paginated, Payment } from '@/types/api';

export interface ManualPaymentInput {
  houseId: string;
  amountCents: number;
  paymentDate?: string;
  paymentReference?: string;
  period?: string;
  tenantId?: string;
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
}

export const paymentsApi = {
  list: (query: { page?: number; limit?: number; houseId?: string; tenantId?: string; estateId?: string } = {}) =>
    apiClient.get<Paginated<Payment>>('/payments', query as Record<string, QueryValue>),
  create: (input: ManualPaymentInput) => apiClient.post<ManualPaymentResult>('/payments', input),
};
