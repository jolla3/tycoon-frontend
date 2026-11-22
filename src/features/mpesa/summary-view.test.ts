import { describe, expect, it } from 'vitest';
import { periodWindow, summaryReconciles, summaryRows } from './summary-view';
import type { MpesaSummary } from '@/lib/api/mpesa-transactions';

const b = (count: number, amountCents: number) => ({ count, amountCents });
const sum = (over: Partial<MpesaSummary> = {}): MpesaSummary => ({
  window: { startDate: '', endDate: '' }, scope: 'CLIENT_WIDE',
  providerObserved: b(5, 10000),
  states: { POSTED: b(2, 8000), ATTRIBUTED: b(1, 900), UNALLOCATED: b(1, 400), QUARANTINED: b(1, 700) },
  verification: { MATCHED: b(0, 0), UNVERIFIED: b(0, 0), CONFLICT: b(0, 0), MANUAL_REVIEW: b(0, 0) },
  posted: { receiptCount: 2, paymentCount: 2, amountCents: 8000, creditEarnedCents: 0 },
  byEstate: [], ...over,
});

describe('periodWindow', () => {
  it('uses Nairobi month bounds', () => {
    expect(periodWindow('2026-02')).toEqual({ startDate: '2026-01-31T21:00:00.000Z', endDate: '2026-02-28T20:59:59.999Z' });
    expect(periodWindow('2028-02')?.endDate).toBe('2028-02-29T20:59:59.999Z');
  });
  it('rejects malformed periods', () => {
    expect(periodWindow('2026-13')).toBeNull();
    expect(periodWindow('x')).toBeNull();
  });
});

describe('summary rows', () => {
  it('orders posted first and reconciles to the observed total', () => {
    const s = sum();
    expect(summaryRows(s).map((r) => r.key)).toEqual(['POSTED', 'ATTRIBUTED', 'UNALLOCATED', 'QUARANTINED']);
    expect(summaryReconciles(s)).toBe(true);
  });
  it('flags a mismatch instead of displaying inconsistent figures', () => {
    expect(summaryReconciles(sum({ providerObserved: b(5, 10001) }))).toBe(false);
  });
});
