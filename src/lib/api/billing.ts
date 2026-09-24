import { apiClient } from './client';
import type { HouseBillingConfig } from './houses';

export interface BillingGenerateResult {
  period: string;
  created: number;
  estates: Array<{ estateId: string; name: string; created: number; period: string }>;
}

export interface HouseBillingAccount {
  house: {
    _id: string;
    houseNumber: string;
    estateId: string;
    status: string;
    monthlyRent: number;
    dueDay?: number;
  };
  estate?: { _id: string; name: string } | null;
  period: string;
  billingConfigs: HouseBillingConfig[];
  currentCharges: Array<{
    _id: string;
    chargeType: string;
    period: string;
    amountDueCents: number;
    amountPaidCents: number;
    balanceCents: number;
    status: string;
    dueDate?: string;
  }>;
  payments: Array<{
    _id: string;
    amountCents: number;
    paymentDate: string;
    paymentReference?: string;
    period?: string;
    status: string;
  }>;
  totals: {
    billedCents: number;
    paidCents: number;
    outstandingCents: number;
    overdueCents: number;
    balanceSource?: string;
  };
  monthly: Array<{
    period: string;
    billedCents: number;
    paidCents: number;
    outstandingCents: number;
    status: string;
    charges: Array<{
      chargeType: string;
      amountDueCents: number;
      amountPaidCents: number;
      balanceCents: number;
      status: string;
    }>;
  }>;
}

export const billingApi = {
  generate: (input?: { estateId?: string; period?: string }) =>
    apiClient.post<BillingGenerateResult>('/billing/generate', input ?? {}),
  houseAccount: (houseId: string) =>
    apiClient.get<HouseBillingAccount>(`/billing/houses/${houseId}/account`),
};
