import { describe, expect, it } from 'vitest';
import { billingLinesEqual, nextBillingPeriod, splitHousesByBillingSource, validateEffectivePeriod } from './plan-edit';

describe('periods', () => {
  it('next period rolls over the year', () => {
    expect(nextBillingPeriod(new Date('2026-12-15T10:00:00Z'))).toBe('2027-01');
    expect(nextBillingPeriod(new Date('2026-06-15T10:00:00Z'))).toBe('2026-07');
  });
  it('uses Nairobi time at a month boundary', () => {
    expect(nextBillingPeriod(new Date('2026-06-30T22:00:00Z'))).toBe('2026-08'); // already 1 July in Nairobi
  });
  it('rejects malformed, current and past months; accepts next and later', () => {
    const now = new Date('2026-06-15T10:00:00Z');
    expect(validateEffectivePeriod('2026-13', now)).toBeTruthy();
    expect(validateEffectivePeriod('', now)).toBeTruthy();
    expect(validateEffectivePeriod('2026-06', now)).toMatch(/never rewritten/);
    expect(validateEffectivePeriod('2026-05', now)).toBeTruthy();
    expect(validateEffectivePeriod('2026-07', now)).toBeNull();
    expect(validateEffectivePeriod('2027-01', now)).toBeNull();
  });
});

describe('billingLinesEqual', () => {
  const rent = { chargeType: 'RENT' as const, description: 'Rent', amountCents: 5000, dueDay: 5 };
  const water = { chargeType: 'WATER' as const, description: 'Water', amountCents: 300, dueDay: 5 };
  it('ignores order and description case', () => {
    expect(billingLinesEqual([rent, water], [water, { ...rent, description: 'rent' }])).toBe(true);
  });
  it('detects amount, due day and line-count changes', () => {
    expect(billingLinesEqual([rent], [{ ...rent, amountCents: 5100 }])).toBe(false);
    expect(billingLinesEqual([rent], [{ ...rent, dueDay: 6 }])).toBe(false);
    expect(billingLinesEqual([rent], [rent, water])).toBe(false);
    expect(billingLinesEqual(undefined, [])).toBe(true);
  });
});

describe('splitHousesByBillingSource', () => {
  it('separates affected HOUSE_TYPE houses from preserved overrides', () => {
    const r = splitHousesByBillingSource([
      { _id: '1', houseNumber: 'A', billingSource: 'HOUSE_TYPE' },
      { _id: '2', houseNumber: 'B', billingSource: 'HOUSE_CONFIG' },
      { _id: '3', houseNumber: 'C', billingSource: 'MONTHLY_RENT' },
      { _id: '4', houseNumber: 'D', billingSource: 'UNCONFIGURED' },
    ]);
    expect(r.affected.map((h) => h._id)).toEqual(['1']);
    expect(r.preserved.map((h) => h._id)).toEqual(['2', '3', '4']);
  });
});
