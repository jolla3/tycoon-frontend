// src/types/api.ts
//
// Types mirror the ACTUAL Mongoose fields / controller responses reviewed
// in the backend. Where a field's exact shape wasn't visible in the
// provided source (e.g. full RentCharge fields on a House), it is marked
// optional/unknown rather than invented — see the contract-gap notes in
// each domain api module.

export type Role = 'CLIENT_OWNER' | 'CLIENT_ADMIN' | 'STAFF' | 'SUPER_ADMIN';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export interface CurrentUser {
  name: string;
  email: string;
  phone?: string;
  role: Role;
  clientId: string;
  estateIds: string[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface Estate {
  _id: string;
  name: string;
  address?: string;
  currency?: string;
  timezone?: string;
  isActive: boolean;
}

export type HouseStatus = 'vacant' | 'occupied' | string;

export interface House {
  _id: string;
  clientId: string;
  estateId: string;
  houseNumber: string;
  houseTypeId?: string | null;
  tenantId?: string | null;
  monthlyRent: number;
  dueDay?: number;
  status: HouseStatus;
  paymentReferences?: string[];
  isActive: boolean;
  houseType?: { _id: string; name: string } | null;
  tenant?: { _id: string; name: string; phone?: string; status?: string } | null;
}

export interface Tenant {
  _id: string;
  clientId: string;
  estateId: string;
  houseId: string;
  name: string;
  phone: string;
  status: string;
  moveInDate?: string;
  moveOutDate?: string;
}

export type RentStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERPAID';

/** Where the money came from. Display only; the backend assigns it. */
export type PaymentOrigin = 'BANK' | 'MANUAL' | 'MPESA' | 'CREDIT';
/** REVERSED payments are retained for audit but are NOT collected money. */
export type PaymentStatus = 'CONFIRMED' | 'REVERSED';

export interface PaymentAllocationBreakdown {
  paymentId: string | null;
  fundingSource: 'RECEIPT' | 'EXISTING_CREDIT';
  paymentOrigin: PaymentOrigin | null;
  tenancyId: string | null;
  houseId: string | null;
  houseNumber: string | null;
  rentChargeId: string | null;
  amountCents: number;
  chargeType: string;
  period: string;
  destinationVerified: boolean;
}

export interface PaymentCurrentAccountPosition {
  creditCents: number;
  outstandingCents: number;
  netCents: number;
  asOf: string;
  balanceScope: 'CURRENT';
}

export interface Payment {
  _id: string;
  clientId: string;
  estateId: string;
  estateName?: string | null;
  houseId: string;
  tenantId?: string | null;
  tenancyId?: string | null;
  bankTransactionId?: string;
  manualReceiptId?: string | null;
  amountCents: number;
  grossReceivedCents?: number;
  paymentDate: string;
  paymentReference?: string | null;
  period: string;
  tenderMethod?: string | null;
  origin: PaymentOrigin;
  status: PaymentStatus;
  provider?: string | null;
  providerTransactionId?: string | null;
  businessShortCode?: string | null;
  /** Resolved server-side for display; null when the relation is missing/deleted. */
  tenantName?: string | null;
  houseNumber?: string | null;
  /** False for CREDIT-origin rows: they apply existing credit and are not money received. */
  isMoneyReceived?: boolean;
  listKind?: 'payment' | 'manual_receipt';
  receiptAppliedCents?: number | null;
  creditAppliedCents?: number | null;
  newCreditCents?: number | null;
  creditBeforeCents?: number | null;
  creditRemainingCents?: number | null;
  creditAfterCents?: number | null;
  receiptReconciliation?: string;
  creditReconciliation?: string;
  settlementIdentity?: string;
  sourceTenancyStatus?: string;
  sourceAmountConsistent?: boolean;
  legacy?: boolean;
  paymentIds?: string[];
  creditPaymentIds?: string[];
  creditMovementIds?: string[];
  allocationBreakdown?: PaymentAllocationBreakdown[];
  /** Current tenant account position at read time, not a historical balance snapshot. */
  currentAccountPosition?: PaymentCurrentAccountPosition | null;
}

/** Public bank account DTO from bank.service toPublicBankAccount — no ciphertext/hashes. */
export interface BankAccount {
  /** Public DTO uses `id` (bank.service toPublicBankAccount). */
  id: string;
  _id?: string; // legacy tolerance
  estateId: string;
  /** Only Co-operative Bank is implemented by the backend. */
  provider: 'COOP';
  /** Parent BankConnection. Connection authorization and account validation are distinct states. */
  connectionId: string;
  accountName: string;
  currency: string;
  connectionStatus: 'pending' | 'connected' | 'failed';
  validationStatus: string;
  lastValidatedAt?: string | null;
  /** Which operations the backend allows for this account. Gate actions on these, not on provider name. */
  entitlements?: { poll?: boolean; statement?: boolean; balance?: boolean; webhookIngest?: boolean };
  lastSyncedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Safe masked hint only — never encrypted/hash fields from API. */
  accountNumberMasked?: string | null;
}

export type MatchStatus = 'MATCHED' | 'UNMATCHED' | 'PARTIAL' | 'MANUAL_REVIEW';
export type TransactionProcessingState = 'RECEIVED' | 'CLAIMED' | 'POSTED' | 'FAILED_RETRYABLE' | 'FAILED_TERMINAL' | 'MANUAL_REVIEW';

export interface BankTransaction {
  _id: string;
  clientId: string;
  estateId: string;
  bankAccountId: string;
  provider: string;
  providerTransactionId: string;
  amountCents: number;
  currency: string;
  transactionDate: string;
  paymentReference?: string;
  narration?: string;
  eventType: 'CREDIT' | 'DEBIT';
  matchedHouseId?: string | null;
  matchedTenantId?: string | null;
  matchStatus: MatchStatus;
  /** Ledger posting progress, separate from matching. Absent until the backend projects it. */
  processingState?: TransactionProcessingState;
}

/**
 * The ACTUAL shape returned by report.service.js#dashboard() — nested, not
 * flat. (A previous version of this type incorrectly copied the flat
 * shape from rentService.summary()/`/reports/monthly` instead — that
 * caused `data.paid`/`data.totalHouseholds` to be undefined at runtime
 * despite typechecking cleanly, since TypeScript had no way to know the
 * type was wrong without checking the real response.)
 */
export interface DashboardSummary {
  houses: { total: number; occupied: number; vacant: number };
  rent: { expectedCents: number; collectedCents: number; outstandingCents: number };
  status: { paid: number; partial: number; unpaid: number };
  bank: { creditsCents: number; debitsCents: number; unmatched: number };
  sms: { sent: number; failed: number; pending: number; unknown: number };
}

/** The flat shape rentService.summary() actually returns — used by /reports/monthly. Do NOT reuse DashboardSummary for this; they are genuinely different response shapes from different backend functions. */
export interface RentSummary {
  totalHouseholds: number;
  paid: number;
  partial: number;
  unpaid: number;
  expectedCents: number;
  collectedCents: number;
  outstandingCents: number;
}

export interface ArrearsRow {
  estateId?: string;
  houseId?: string;
  house?: string;
  tenantId?: string;
  tenant?: string;
  period?: string;
  chargeType?: string;
  dueCents: number;
  paidCents: number;
  balanceCents: number;
  status: RentStatus;
  dueDate?: string;
  referencePeriod?: string;
}

export interface BankTransactionsReport {
  totalCreditsCents: number;
  totalDebitsCents: number;
  matched: number;
  unmatched: number;
}

export interface SmsReport {
  sent: number;
  failed: number;
  pending: number;
  unknown: number;
}

export interface SmsMessage {
  _id: string;
  phoneNumber: string;
  message: string;
  type: string;
  status: 'queued' | 'processing' | 'sent' | 'failed' | 'unknown' | 'cancelled';
  deliveryMode?: 'STANDARD' | 'G5_PROTECTED';
  dispatchMode?: 'ENABLED' | 'SUPPRESSED';
  dispatchMode?: 'ENABLED' | 'SUPPRESSED';
  createdAt: string;
  sentAt?: string;
  failureReason?: string | null;
}

export interface StaffUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  estateIds?: string[];
  createdAt: string;
}
