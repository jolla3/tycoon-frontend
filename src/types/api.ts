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

export interface Payment {
  _id: string;
  clientId: string;
  estateId: string;
  houseId: string;
  tenantId?: string;
  bankTransactionId?: string;
  amountCents: number;
  paymentDate: string;
  paymentReference?: string;
  period: string;
}

/** Public bank account DTO from bank.service toPublicBankAccount — no ciphertext/hashes. */
export interface BankAccount {
  /** Public DTO uses `id` (bank.service toPublicBankAccount). */
  id: string;
  _id?: string; // legacy tolerance
  estateId: string;
  provider: 'COOP' | 'KCB' | 'EQUITY' | 'NCBA';
  accountName: string;
  currency: string;
  connectionStatus: 'pending' | 'connected' | 'failed';
  lastSyncedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Safe masked hint only — never encrypted/hash fields from API. */
  accountNumberMasked?: string | null;
}

export type MatchStatus = 'MATCHED' | 'UNMATCHED';

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
  status: 'queued' | 'processing' | 'sent' | 'failed' | 'unknown';
  createdAt: string;
  sentAt?: string;
  failureReason?: string;
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
