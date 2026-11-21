// View rules for the M-PESA aggregate summary. Metric meanings are defined by the
// backend (src/services/mpesaReceiptSummary.js); this only labels and orders them.
import type { MpesaSummary, MpesaSummaryState } from '@/lib/api/mpesa-transactions';

/** Nairobi (UTC+3, no DST) month bounds as ISO instants for a 'YYYY-MM' period. */
export function periodWindow(period: string): { startDate: string; endDate: string } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (!m) return null;
  const y = Number(m[1]); const mo = Number(m[2]);
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const mm = String(mo).padStart(2, '0');
  return {
    startDate: new Date(`${y}-${mm}-01T00:00:00+03:00`).toISOString(),
    endDate: new Date(`${y}-${mm}-${String(last).padStart(2, '0')}T23:59:59.999+03:00`).toISOString(),
  };
}

export const STATE_ORDER: MpesaSummaryState[] = ['POSTED', 'ATTRIBUTED', 'UNALLOCATED', 'QUARANTINED'];

export const STATE_COPY: Record<MpesaSummaryState, { label: string; help: string }> = {
  POSTED: { label: 'Posted as rent payments', help: 'Already turned into rent payments. This money is counted once, here.' },
  ATTRIBUTED: { label: 'Matched to an estate, not yet posted', help: 'Tied to an estate by reference or verified attribution and waiting to be posted (includes failed attempts).' },
  UNALLOCATED: { label: 'Unallocated', help: 'Received but not tied to any estate. Not rent.' },
  QUARANTINED: { label: 'Held for review', help: 'Conflicting or flagged receipts. Not counted as rent until resolved.' },
};

export interface SummaryRow { key: MpesaSummaryState; label: string; help: string; count: number; amountCents: number }

export function summaryRows(s: MpesaSummary): SummaryRow[] {
  return STATE_ORDER.map((key) => ({ key, ...STATE_COPY[key], count: s.states[key].count, amountCents: s.states[key].amountCents }));
}

/** True when the buckets reconcile to the observed total (they must; a mismatch means do not display). */
export function summaryReconciles(s: MpesaSummary): boolean {
  const count = STATE_ORDER.reduce((a, k) => a + s.states[k].count, 0);
  const cents = STATE_ORDER.reduce((a, k) => a + s.states[k].amountCents, 0);
  return count === s.providerObserved.count && cents === s.providerObserved.amountCents;
}
