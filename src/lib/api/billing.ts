import { apiClient } from './client';
import type { HouseBillingConfig } from './houses';
import type { Payment } from '@/types/api';
import type { BalanceSource, HistoricalCoverage, LedgerEntry } from '@/types/financial';

export interface BillingGenerateResult {
  period: string;
  created: number;
  estates: Array<{
    estateId: string;
    name: string;
    created: number;
    period: string;
    /** Tenancies that covered the full period and were billed. */
    eligibleTenancies: number;
    /** Tenancies that started or ended mid-period and were NOT billed. Billing them is a manual decision. */
    partialPeriodExcluded: number;
  }>;
}

/** Active-tenancy and house-wide figures are different things; see `totals.note`. */
export interface HouseBillingAccount {
  house: {
    _id: string;
    houseNumber: string;
    estateId: string;
    status: string;
    monthlyRent: number;
    dueDay?: number;
    houseTypeId: string | null;
  };
  estate: { _id: string; name: string } | null;
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
    tenancyId?: string | null;
  }>;
  /** CONFIRMED payments only, most recent 100. */
  payments: Payment[];
  ledger: LedgerEntry[];
  currentTenancyId: string | null;
  totals: {
    billedCents: number;
    paidCents: number;
    /** House-wide known arrears across tenancies. NOT the current occupant's liability. */
    outstandingCents: number | null;
    knownArrearsCents: number | null;
    historicalCoverage: HistoricalCoverage;
    verifiedFullObligation: boolean;
    overdueCents: number;
    /** Active occupancy only. Null when there is no active tenancy or no ledger figure. */
    currentTenancyBalanceCents: number | null;
    currentTenancyHistoricalCoverage: HistoricalCoverage;
    currentTenancyBalanceVerified: boolean;
    /** Open charges with no tenancy attribution (legacy). Never assign these to the current tenant. */
    historicalUnattributedCents: number;
    balanceSource: BalanceSource;
    note: string;
  };
  monthly: Array<{
    period: string;
    billedCents: number;
    paidCents: number;
    outstandingCents: number;
    status: string;
    charges: Array<{
      chargeType: string;
      description?: string;
      amountDueCents: number;
      amountPaidCents: number;
      balanceCents: number;
      status: string;
      dueDate?: string;
      tenancyId?: string | null;
    }>;
    /** Open balance per tenancy id, plus an "unattributed" bucket. */
    byTenancy: Record<string, number>;
  }>;
}

export const billingApi = {
  generate: (input?: { estateId?: string; period?: string }) =>
    apiClient.post<BillingGenerateResult>('/billing/generate', input ?? {}),
  houseAccount: (houseId: string) =>
    apiClient.get<HouseBillingAccount>(`/billing/houses/${houseId}/account`),
};
