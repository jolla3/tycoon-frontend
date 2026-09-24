import { apiClient } from './client';

export interface DepositRecord {
  _id: string;
  requiredCents: number;
  paidCents: number;
  heldCents: number;
  refundedCents: number;
  status: string;
  deductions?: Array<{ amountCents: number; reason: string; notes?: string; deductedAt?: string }>;
  settledAt?: string;
}

export const depositsApi = {
  get: (tenantId: string) => apiClient.get<{ deposit: DepositRecord | null }>(`/deposits/${tenantId}`),
  require: (tenantId: string, requiredCents: number) =>
    apiClient.post<DepositRecord>(`/deposits/${tenantId}/require`, { requiredCents }),
  pay: (tenantId: string, amountCents: number) =>
    apiClient.post<DepositRecord>(`/deposits/${tenantId}/pay`, { amountCents }),
  deduct: (tenantId: string, body: { amountCents: number; reason: string; notes?: string }) =>
    apiClient.post<DepositRecord>(`/deposits/${tenantId}/deduct`, body),
  settle: (tenantId: string) => apiClient.post(`/deposits/${tenantId}/settle`),
};
