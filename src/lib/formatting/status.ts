// src/lib/formatting/status.ts — the ONE status→label/color mapping.
// These labels are DISPLAY ONLY — the status value itself always comes
// from the backend (section 28: never compute PAID/PARTIAL/etc. in React).
import type { MatchStatus, RentStatus } from '@/types/api';

export const rentStatusMeta: Record<RentStatus, { label: string; color: 'success' | 'warning' | 'error' | 'info' }> = {
  PAID: { label: 'Paid', color: 'success' },
  PARTIAL: { label: 'Partially Paid', color: 'warning' },
  UNPAID: { label: 'Unpaid', color: 'error' },
  OVERPAID: { label: 'Overpaid', color: 'info' },
};

export const matchStatusMeta: Record<MatchStatus, { label: string; color: 'success' | 'warning' }> = {
  MATCHED: { label: 'Reconciled', color: 'success' },
  UNMATCHED: { label: 'Unmatched', color: 'warning' },
};
