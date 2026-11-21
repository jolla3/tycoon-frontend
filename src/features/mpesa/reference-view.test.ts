import { describe, expect, it } from 'vitest';
import { paymentInstruction, referenceState } from './reference-view';
import type { TenantReferenceMerchant } from '@/lib/api/mpesa-collection';

const ref = (over = {}) => ({ id: 'r', reference: 'T123456789', display: 'T1234-5678-9', issuedAt: null, ...over });
const m = (over: Partial<TenantReferenceMerchant> = {}): TenantReferenceMerchant => ({
  merchantProfileId: 'p', displayName: 'Main', businessShortCode: '123456', active: null, retired: [], retiredCount: 0, canIssue: false, ...over,
});

describe('referenceState', () => {
  it('active wins', () => expect(referenceState(m({ active: ref() }), { status: 'ACTIVE' })).toBe('ACTIVE'));
  it('issuable only when the server says so', () => {
    expect(referenceState(m({ canIssue: true }), { status: 'ACTIVE' })).toBe('NONE_ISSUABLE');
    expect(referenceState(m({ canIssue: false }), { status: 'ACTIVE' })).toBe('NONE_CLOSED');
  });
  it('closed tenancy with history is retired-only', () => {
    expect(referenceState(m({ retiredCount: 2, retired: [ref({ retiredAt: 'x' })] }), { status: 'CLOSED' })).toBe('RETIRED_ONLY');
    expect(referenceState(m(), { status: 'CLOSED' })).toBe('NONE_CLOSED');
  });
});

describe('paymentInstruction', () => {
  it('is built from the ACTIVE raw reference and shortcode', () => {
    const t = paymentInstruction(m({ active: ref() }));
    expect(t).toContain('123456');
    expect(t).toContain('T123456789');
  });
  it('never produces instructions from a retired reference', () => {
    expect(paymentInstruction(m({ retired: [ref({ retiredAt: 'x' })], retiredCount: 1 }))).toBeNull();
  });
});
