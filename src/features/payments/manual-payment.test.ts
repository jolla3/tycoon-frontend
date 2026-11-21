import { describe, expect, it } from 'vitest';
import { buildManualPaymentInput, describeTenancy, resolveChoice, tenancyToSubmit } from './manual-payment';
import type { ManualPaymentOptions, TenancyOption } from '@/lib/api/payments';

const opt = (o: Partial<TenancyOption>): TenancyOption => ({
  tenancyId: 't1', tenantName: 'Alice', startAt: '2026-01-01', endAt: null, status: 'ACTIVE', coversPeriod: true, reason: null, ...o,
});
const opts = (o: Partial<ManualPaymentOptions>): ManualPaymentOptions => ({
  houseId: 'h', period: '2026-06', resolution: 'NONE', defaultTenancyId: null, options: [], ...o,
});

describe('resolveChoice', () => {
  it('is loading without data', () => expect(resolveChoice(undefined).kind).toBe('loading'));
  it('unique: uses the backend default and submits it', () => {
    const a = opt({ tenancyId: 'A' });
    const s = resolveChoice(opts({ resolution: 'UNIQUE', defaultTenancyId: 'A', options: [a, opt({ tenancyId: 'B', coversPeriod: false })] }));
    expect(s.kind).toBe('unique');
    expect(tenancyToSubmit(s, '')).toBe('A');
  });
  it('multiple covering tenancies require an explicit, valid choice', () => {
    const s = resolveChoice(opts({ resolution: 'AMBIGUOUS', options: [opt({ tenancyId: 'A' }), opt({ tenancyId: 'B' })] }));
    expect(s.kind).toBe('choose');
    expect(tenancyToSubmit(s, '')).toBeNull();
    expect(tenancyToSubmit(s, 'zzz')).toBeNull();
    expect(tenancyToSubmit(s, 'B')).toBe('B');
  });
  it('none: never submits, even if a non-covering id is "selected"', () => {
    const s = resolveChoice(opts({ resolution: 'NONE', options: [opt({ tenancyId: 'X', coversPeriod: false, reason: 'ended' })] }));
    expect(s.kind).toBe('none');
    expect(tenancyToSubmit(s, 'X')).toBeNull();
  });
  it('a unique resolution without a matching default option fails closed', () => {
    expect(resolveChoice(opts({ resolution: 'UNIQUE', defaultTenancyId: 'gone', options: [] })).kind).toBe('none');
  });
});

describe('buildManualPaymentInput', () => {
  const ok = { houseId: 'h', period: '2026-06', amountKes: '1500.50', reference: ' ref ', tenancyId: 'A' };
  it('builds cents, trims the reference and sends period + tenancyId', () => {
    expect(buildManualPaymentInput(ok)).toEqual({ houseId: 'h', period: '2026-06', tenancyId: 'A', amountCents: 150050, paymentReference: 'ref' });
  });
  it('rejects missing tenancy, bad period, non-positive amount', () => {
    expect(() => buildManualPaymentInput({ ...ok, tenancyId: null })).toThrow(/tenancy/i);
    expect(() => buildManualPaymentInput({ ...ok, period: '2026-13' })).toThrow(/month/i);
    expect(() => buildManualPaymentInput({ ...ok, amountKes: '0' })).toThrow(/positive/i);
  });
});

describe('describeTenancy', () => {
  it('shows tenant and dates, never ids', () => {
    const text = describeTenancy(opt({ tenancyId: '64b7f0a1c2d3e4f5a6b7c8d9' }), (d) => d);
    expect(text).toContain('Alice');
    expect(text).toContain('present');
    expect(text).not.toContain('64b7f0a1');
  });
});

describe('older tenancies beyond the first page', () => {
  const many = Array.from({ length: 60 }, (_, i) => opt({ tenancyId: `T${i}`, coversPeriod: false, reason: 'ended', status: 'CLOSED' }));
  it('resolves from eligibleOptions even when the covering tenancy is not on the loaded page', () => {
    const old = opt({ tenancyId: 'OLD-COVERING' });
    const s = resolveChoice(opts({ resolution: 'UNIQUE', defaultTenancyId: 'OLD-COVERING', options: many.slice(0, 50), eligibleOptions: [old], total: 61, hasMore: true }));
    expect(s.kind).toBe('unique');
    expect(tenancyToSubmit(s, '')).toBe('OLD-COVERING');
  });
  it('a page of 50 non-covering tenancies with an ambiguous eligible set still forces an explicit choice', () => {
    const s = resolveChoice(opts({ resolution: 'AMBIGUOUS', options: many.slice(0, 50), eligibleOptions: [opt({ tenancyId: 'A' }), opt({ tenancyId: 'B' })] }));
    expect(s.kind).toBe('choose');
    expect(tenancyToSubmit(s, 'T3')).toBeNull();
  });
  it('NONE shows the paged list but never submits', () => {
    const s = resolveChoice(opts({ resolution: 'NONE', options: many.slice(0, 50), eligibleOptions: [] }));
    expect(s.kind).toBe('none');
    expect(tenancyToSubmit(s, 'T1')).toBeNull();
  });
});
