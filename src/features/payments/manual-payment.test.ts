import { describe, expect, it } from 'vitest';
import {
  activeSelection, buildManualPaymentInput, describeTenancy, dialogReducer, initialDialogState, pageCount, resolveChoice, tenancyToSubmit,
  type DialogAction, type DialogState,
} from './manual-payment';
import type { ManualPaymentOptions, TenancyOption } from '@/lib/api/payments';

const opt = (o: Partial<TenancyOption>): TenancyOption => ({
  tenancyId: 't1', tenantName: 'Alice', startAt: '2026-01-01', endAt: null, status: 'ACTIVE', coversPeriod: true, reason: null, ...o,
});
const CTX = { houseId: 'h', period: '2026-06' };
const sel = (items: TenancyOption[], o: Partial<ManualPaymentOptions['eligibleSelection'] & object> = {}) =>
  ({ items, page: 1, limit: 10, total: items.length, hasMore: false, search: '', ...o });
const opts = (o: Partial<ManualPaymentOptions>): ManualPaymentOptions => ({
  houseId: 'h', period: '2026-06', resolution: 'NONE', defaultTenancyId: null, options: [], ...o,
});
/** A server that holds N eligible tenancies and serves pages/search like the real endpoint (newest first). */
const server = (n: number) => {
  const all = Array.from({ length: n }, (_, i) => opt({ tenancyId: `T${n - i}`, tenantName: `Tenant ${String(n - i).padStart(2, '0')}` }));
  return (page: number, search = '', limit = 10): ManualPaymentOptions => {
    const hits = all.filter((o) => o.tenantName.toLowerCase().includes(search.toLowerCase()));
    return opts({
      resolution: 'AMBIGUOUS', eligibleTotal: n,
      eligibleSelection: sel(hits.slice((page - 1) * limit, page * limit), { page, limit, total: hits.length, hasMore: page * limit < hits.length, search }),
      options: [opt({ tenancyId: 'OLD', coversPeriod: false, reason: 'ended', status: 'CLOSED' })],
    });
  };
};
const run = (actions: DialogAction[], from: DialogState = initialDialogState('2026-06')) => actions.reduce(dialogReducer, from);

describe('resolveChoice', () => {
  it('is loading without data', () => expect(resolveChoice(undefined).kind).toBe('loading'));
  it('unique: uses the backend default and submits it (no selection needed)', () => {
    const a = opt({ tenancyId: 'A' });
    const s = resolveChoice(opts({ resolution: 'UNIQUE', defaultTenancyId: 'A', eligibleTotal: 1, eligibleSelection: sel([a]) }), CTX);
    expect(s.kind).toBe('unique');
    expect(tenancyToSubmit(s, null)).toBe('A');
  });
  it('ambiguous requires an explicit selection; none is never auto-picked (not even the newest)', () => {
    const s = resolveChoice(server(3)(1), CTX);
    expect(s.kind).toBe('choose');
    expect(tenancyToSubmit(s, null)).toBeNull();
    expect(tenancyToSubmit(s, opt({ tenancyId: 'T3' }))).toBe('T3');
  });
  it('none: never submits, even with a selection object', () => {
    const s = resolveChoice(opts({ resolution: 'NONE', options: [opt({ tenancyId: 'X', coversPeriod: false, reason: 'ended' })] }), CTX);
    expect(s.kind).toBe('none');
    expect(tenancyToSubmit(s, opt({ tenancyId: 'X' }))).toBeNull();
    expect(s.kind === 'none' && s.history.map((h) => h.tenancyId)).toEqual(['X']); // history explains NONE
  });
  it('a unique resolution whose default is not in the eligible list fails closed', () => {
    expect(resolveChoice(opts({ resolution: 'UNIQUE', defaultTenancyId: 'gone', eligibleSelection: sel([]) }), CTX).kind).toBe('none');
  });
  it('options for another house or period are treated as loading (stale placeholder data)', () => {
    expect(resolveChoice(server(3)(1), { houseId: 'other', period: '2026-06' }).kind).toBe('loading');
    expect(resolveChoice(server(3)(1), { houseId: 'h', period: '2026-07' }).kind).toBe('loading');
  });
  it('ineligible rows in the eligible list and in history are never offered as choices', () => {
    const s = resolveChoice(opts({ resolution: 'AMBIGUOUS', eligibleTotal: 2, eligibleSelection: sel([opt({ tenancyId: 'A' }), opt({ tenancyId: 'B', coversPeriod: false }), opt({ tenancyId: 'C' })]), options: [opt({ tenancyId: 'H', coversPeriod: false })] }), CTX);
    expect(s.kind === 'choose' && s.selection.items.map((i) => i.tenancyId)).toEqual(['A', 'C']);
  });
});

describe('selection beyond the first 20 eligible tenancies (35 eligible)', () => {
  const srv = server(35);
  it('every tenancy is reachable by paging; the 35th is on page 4', () => {
    const seen = new Set<string>();
    for (let p = 1; p <= 4; p += 1) {
      const c = resolveChoice(srv(p), CTX);
      expect(c.kind).toBe('choose');
      if (c.kind === 'choose') { expect(c.eligibleTotal).toBe(35); c.selection.items.forEach((i) => seen.add(i.tenancyId)); }
    }
    expect(seen.size).toBe(35);
    expect(seen.has('T1') && seen.has('T35')).toBe(true);
    const last = resolveChoice(srv(4), CTX);
    expect(last.kind === 'choose' && last.selection.hasMore).toBe(false);
  });
  it('an item at position 25 can be selected, and its exact id is what is submitted', () => {
    const c = resolveChoice(srv(3), CTX);
    const pick = c.kind === 'choose' ? c.selection.items[4] : null; // overall rank 25
    expect(pick).toBeTruthy();
    const s = run([{ type: 'house', houseId: 'h' }, { type: 'select', option: pick! }]);
    expect(tenancyToSubmit(c, activeSelection(s))).toBe(pick!.tenancyId);
  });
  it('search finds eligible records beyond page one, with the exact match count', () => {
    const c = resolveChoice(srv(1, 'tenant 03'), CTX);
    expect(c.kind === 'choose' && c.selection.items.map((i) => i.tenancyId)).toEqual(['T3']);
    expect(c.kind === 'choose' && c.selection.total).toBe(1);
    expect(c.kind === 'choose' && c.eligibleTotal).toBe(35); // unfiltered count unchanged
  });
  it('pageCount covers every record', () => {
    expect(pageCount(35, 10)).toBe(4);
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(40, 10)).toBe(4);
  });
});

describe('dialog reducer', () => {
  const base = run([{ type: 'house', houseId: 'h' }]);
  it('a chosen tenancy is kept when paging away', () => {
    const s = run([{ type: 'select', option: opt({ tenancyId: 'T25' }) }, { type: 'page', page: 4 }, { type: 'page', page: 1 }], base);
    expect(activeSelection(s)?.tenancyId).toBe('T25');
  });
  it('changing the house clears selection, search and page', () => {
    const s = run([{ type: 'search', search: 'ab' }, { type: 'page', page: 3 }, { type: 'select', option: opt({ tenancyId: 'T9' }) }, { type: 'house', houseId: 'h2' }], base);
    expect(s).toMatchObject({ houseId: 'h2', search: '', page: 1, selected: null });
  });
  it('changing the period clears selection, search and page', () => {
    const s = run([{ type: 'page', page: 3 }, { type: 'select', option: opt({ tenancyId: 'T9' }) }, { type: 'period', period: '2026-07' }], base);
    expect(s).toMatchObject({ period: '2026-07', search: '', page: 1, selected: null });
  });
  it('a selection made for another house/period never counts, even if state was not reset', () => {
    const s = { ...base, selected: { houseId: 'h', period: '2026-05', option: opt({ tenancyId: 'T9' }) } };
    expect(activeSelection(s)).toBeNull();
  });
  it('changing the search resets the page but keeps the selection', () => {
    const s = run([{ type: 'select', option: opt({ tenancyId: 'T9' }) }, { type: 'page', page: 4 }, { type: 'search', search: 'ten' }], base);
    expect(s.page).toBe(1);
    expect(activeSelection(s)?.tenancyId).toBe('T9');
  });
  it('an unchanged search does not reset the page (no navigation loop)', () => {
    const s = run([{ type: 'search', search: 'ten' }, { type: 'page', page: 3 }, { type: 'search', search: 'ten' }], base);
    expect(s.page).toBe(3);
  });
  it('bounds the search length and clamps the page', () => {
    expect(run([{ type: 'search', search: 'x'.repeat(500) }], base).search.length).toBe(80);
    expect(run([{ type: 'page', page: -4 }], base).page).toBe(1);
    expect(run([{ type: 'page', page: Number.NaN }], base).page).toBe(1);
  });
  it('an ineligible tenancy cannot be selected', () => {
    expect(activeSelection(run([{ type: 'select', option: opt({ tenancyId: 'H', coversPeriod: false }) }], base))).toBeNull();
  });
  it('clear removes the selection and blocks submit again', () => {
    const c = resolveChoice(server(5)(1), CTX);
    const s = run([{ type: 'select', option: opt({ tenancyId: 'T5' }) }, { type: 'clear' }], base);
    expect(tenancyToSubmit(c, activeSelection(s))).toBeNull();
  });
});

describe('stale results cannot be submitted', () => {
  it('not fresh (loading / refetching / placeholder) blocks both unique and chosen submits', () => {
    const u = resolveChoice(opts({ resolution: 'UNIQUE', defaultTenancyId: 'A', eligibleSelection: sel([opt({ tenancyId: 'A' })]) }), CTX);
    const c = resolveChoice(server(3)(1), CTX);
    expect(tenancyToSubmit(u, null, false)).toBeNull();
    expect(tenancyToSubmit(c, opt({ tenancyId: 'T3' }), false)).toBeNull();
    expect(tenancyToSubmit(c, opt({ tenancyId: 'T3' }), true)).toBe('T3');
  });
});

describe('buildManualPaymentInput', () => {
  const ok = {
    houseId: 'h',
    amountKes: '1500.50',
    paymentDate: '2026-06-15',
    tenderMethod: 'CASH' as const,
    reference: ' ref ',
    idempotencyKey: 'sub-key-12345678',
  };
  it('builds cents, trims the reference and requires method + date + identity', () => {
    expect(buildManualPaymentInput(ok)).toEqual({
      houseId: 'h',
      amountCents: 150050,
      paymentDate: '2026-06-15',
      tenderMethod: 'CASH',
      idempotencyKey: 'sub-key-12345678',
      paymentReference: 'ref',
    });
  });
  it('rejects missing house/method/date/identity and non-positive amount', () => {
    expect(() => buildManualPaymentInput({ ...ok, houseId: '' })).toThrow(/house/i);
    expect(() => buildManualPaymentInput({ ...ok, tenderMethod: '' })).toThrow(/method/i);
    expect(() => buildManualPaymentInput({ ...ok, paymentDate: 'not-a-date' })).toThrow(/date/i);
    expect(() => buildManualPaymentInput({ ...ok, idempotencyKey: 'short' })).toThrow(/identity/i);
    expect(() => buildManualPaymentInput({ ...ok, amountKes: '0' })).toThrow(/positive/i);
    expect(() => buildManualPaymentInput({ ...ok, amountKes: 'abc' })).toThrow(/positive/i);
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
