// src/types/financial.ts
//
// Shared financial DTO building blocks, typed from the backend source at
// cc98900 (ledger.service.js, tenant.service.js, rent.service.js,
// houseType.service.js). The backend is the only authority for these figures;
// the frontend never recomputes, nets or "repairs" them.
//
// Rule: a balance that is `null` or unverified is NOT zero. Render it through
// lib/formatting/balance.ts, never `?? 0`.

/** The backend currently only ever emits UNVERIFIED. Presentation keys off `verifiedFullObligation`, not this string. */
export type HistoricalCoverage = 'UNVERIFIED';

export type BalanceSource =
  | 'ledger_tenancy_sum'
  | 'ledger_tenancy_aggregate'
  | 'tenant_without_tenancy_scope'
  | 'no_tenancy'
  | 'unavailable';

/** Ledger-derived arrears. `knownArrearsCents` is a LOWER BOUND unless `verifiedFullObligation` is true. */
export interface KnownArrears {
  knownArrearsCents: number | null;
  historicalCoverage: HistoricalCoverage;
  verifiedFullObligation: boolean;
  balanceSource: BalanceSource;
}

/** Open-charge totals for one slice of history (current tenancy, historical, unattributed or orphaned). */
export interface ChargeSlice {
  billedCents: number;
  collectedCents: number;
  outstandingCents: number;
  /** Over-collected on open charges. Tenant credit, not a negative balance. */
  overpaidCreditCents: number;
}

export interface LedgerEntry {
  _id: string;
  tenancyId?: string | null;
  tenantId?: string | null;
  accountCategory: string;
  entryType: string;
  amountCents: number;
  runningBalanceCents: number;
  referenceType?: string | null;
  description?: string;
  period?: string | null;
  createdAt: string;
}
