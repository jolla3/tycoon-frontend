// Pure rules for editing a HouseType's versioned billing plan.
import type { HouseTypeBillingLine } from '@/lib/api/house-types';

const PERIOD = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** First month a plan change may start: the month after `now` (Africa/Nairobi). */
export function nextBillingPeriod(now: Date = new Date()): string {
  const ym = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }).slice(0, 7);
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/** Null when valid. A change may not start in the past or the current month: that would rewrite history. */
export function validateEffectivePeriod(period: string, now: Date = new Date()): string | null {
  if (!PERIOD.test(period)) return 'Choose the month the new plan starts';
  if (period < nextBillingPeriod(now)) return 'The new plan must start next month or later; past and current charges are never rewritten';
  return null;
}

const norm = (l: HouseTypeBillingLine) =>
  `${l.chargeType}|${(l.description ?? '').trim().toLowerCase()}|${l.amountCents}|${l.dueDay ?? ''}`;

/** Order-insensitive comparison of plan lines. */
export function billingLinesEqual(a: HouseTypeBillingLine[] | undefined, b: HouseTypeBillingLine[] | undefined): boolean {
  const x = (a ?? []).map(norm).sort();
  const y = (b ?? []).map(norm).sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

export interface WorkspaceHouseLite { _id: string; houseNumber: string; billingSource: string }

/**
 * Houses whose charges follow the HouseType plan (affected by a plan change)
 * versus houses billed another way (their own overrides are preserved).
 */
export function splitHousesByBillingSource<T extends WorkspaceHouseLite>(houses: T[]): { affected: T[]; preserved: T[] } {
  return {
    affected: houses.filter((h) => h.billingSource === 'HOUSE_TYPE'),
    preserved: houses.filter((h) => h.billingSource !== 'HOUSE_TYPE'),
  };
}
