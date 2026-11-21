// src/lib/api/deposits.ts — routes/deposit.routes.js
//
// pay and deduct REQUIRE an Idempotency-Key header. The key is created by the
// caller at the moment the user commits to the action (newIdempotencyKey) and
// reused for every retry of that same action.
import { apiClient } from './client';
import type { BalanceSource, HistoricalCoverage } from '@/types/financial';
import type { Tenant } from '@/types/api';
import type { EligibleTenancy } from '@/features/deposits/deposit-state';

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
  tenant?: Tenant;
  tenancy?: unknown;
  deposit: DepositRecord | null;
  activeTenancyId: string | null;
  balance: DepositBalance | null;
  /** True when the tenant has several eligible tenancies: the caller must choose one explicitly. */
  ambiguous?: boolean;
  eligibleTenancyCount?: number;
  eligibleTenancies?: EligibleTenancy[];
}

export interface DepositActionOptions {
  idempotencyKey: string;
  /** Exact tenancy the action applies to. Always sent when known. */
  tenancyId?: string | null;
}

const exact = (tenancyId?: string | null) => (tenancyId ? { tenancyId } : {});

export const depositsApi = {
  get: (tenantId: string, tenancyId?: string | null) =>
    apiClient.get<DepositView>(`/deposits/${tenantId}`, tenancyId ? { tenancyId } : undefined),
  require: (tenantId: string, requiredCents: number, tenancyId?: string | null) =>
    apiClient.post<DepositRecord>(`/deposits/${tenantId}/require`, { requiredCents, ...exact(tenancyId) }),
  pay: (tenantId: string, amountCents: number, { idempotencyKey, tenancyId }: DepositActionOptions) =>
    apiClient.post<DepositRecord>(`/deposits/${tenantId}/pay`, { amountCents, ...exact(tenancyId) }, undefined, { idempotencyKey }),
  deduct: (tenantId: string, body: { amountCents: number; reason: string; notes?: string }, { idempotencyKey, tenancyId }: DepositActionOptions) =>
    apiClient.post<DepositRecord>(`/deposits/${tenantId}/deduct`, { ...body, ...exact(tenancyId) }, undefined, { idempotencyKey }),
  /** Marks the deposit record settled. It does NOT refund money or move the tenant out. */
  settle: (tenantId: string, tenancyId?: string | null) =>
    apiClient.post<DepositRecord>(`/deposits/${tenantId}/settle`, exact(tenancyId)),
};
