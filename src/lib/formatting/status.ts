// src/lib/formatting/status.ts — the ONE status→label/color mapping.
// These labels are DISPLAY ONLY — the status value itself always comes
// from the backend (section 28: never compute PAID/PARTIAL/etc. in React).
import type { MatchStatus, PaymentOrigin, PaymentStatus, RentStatus, TransactionProcessingState } from '@/types/api';

export const rentStatusMeta: Record<RentStatus, { label: string; color: 'success' | 'warning' | 'error' | 'info' }> = {
  PAID: { label: 'Paid', color: 'success' },
  PARTIAL: { label: 'Partially Paid', color: 'warning' },
  UNPAID: { label: 'Unpaid', color: 'error' },
  OVERPAID: { label: 'Overpaid', color: 'info' },
};

export const matchStatusMeta: Record<MatchStatus, { label: string; color: 'success' | 'warning' | 'info' }> = {
  MATCHED: { label: 'Matched', color: 'success' },
  UNMATCHED: { label: 'Unmatched', color: 'warning' },
  PARTIAL: { label: 'Partially matched', color: 'info' },
  MANUAL_REVIEW: { label: 'Needs review', color: 'warning' },
};

export const processingStateMeta: Record<TransactionProcessingState, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  RECEIVED: { label: 'Received', color: 'default' },
  CLAIMED: { label: 'Processing', color: 'info' },
  POSTED: { label: 'Posted to ledger', color: 'success' },
  FAILED_RETRYABLE: { label: 'Failed, will retry', color: 'warning' },
  FAILED_TERMINAL: { label: 'Failed', color: 'error' },
  MANUAL_REVIEW: { label: 'Needs review', color: 'warning' },
};

export const paymentStatusMeta: Record<PaymentStatus, { label: string; color: 'success' | 'error' }> = {
  CONFIRMED: { label: 'Confirmed', color: 'success' },
  REVERSED: { label: 'Reversed', color: 'error' },
};

export const paymentOriginMeta: Record<PaymentOrigin, string> = {
  BANK: 'Bank',
  MANUAL: 'Manual entry',
  MPESA: 'M-PESA',
  CREDIT: 'Tenant credit',
};
