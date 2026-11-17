// src/lib/api/deposits.ts — routes/deposit.routes.js
//
// pay and deduct REQUIRE an Idempotency-Key header. The key is created by the
// caller at the moment the user commits to the action (newIdempotencyKey) and
// reused for every retry of that same action.
import { apiClient } from './client';
import type { BalanceSource, HistoricalCoverage } from '@/types/financial';
import type { Tenant } from '@/types/api';

export interface DepositRecord {
  _id: string;
  tenancyId?: string | null;
  tenantId?: string;
  requiredCents: number;
  paidCents: number;
  heldCents: number;
  refundedCents: number;
  status: string;
  deductions?: Array<{ amountCents: number; reason: string; notes?: string; deductedAt?: string }>;
  settledAt?: string;
}

/** Ledger DEPOSIT-category balance for the active tenancy. Null when there is no active tenancy. */
export interface DepositBalance {
  knownLedgerSumCents: number | null;
  depositHeldCents?: number;
  depositIntegrityOk?: boolean;
  historicalCoverage: HistoricalCoverage;
  verifiedFullObligation: boolean;
  source: BalanceSource;
}

export interface DepositView {
  tenant: Tenant;
  deposit: DepositRecord | null;
  activeTenancyId: string | null;
  balance: DepositBalance | null;
}

export interface DepositActionOptions {
  idempotencyKey: string;
}

export const depositsApi = {
  get: (tenantId: string) => apiClient.get<DepositView>(`/deposits/${tenantId}`),
  require: (tenantId: string, requiredCents: number) =>
    apiClient.post<DepositRecord>(`/deposits/${tenantId}/require`, { requiredCents }),
  pay: (tenantId: string, amountCents: number, { idempotencyKey }: DepositActionOptions) =>
    apiClient.post<DepositRecord>(`/deposits/${tenantId}/pay`, { amountCents }, undefined, { idempotencyKey }),
  deduct: (tenantId: string, body: { amountCents: number; reason: string; notes?: string }, { idempotencyKey }: DepositActionOptions) =>
    apiClient.post<DepositRecord>(`/deposits/${tenantId}/deduct`, body, undefined, { idempotencyKey }),
  settle: (tenantId: string) => apiClient.post<unknown>(`/deposits/${tenantId}/settle`),
};
