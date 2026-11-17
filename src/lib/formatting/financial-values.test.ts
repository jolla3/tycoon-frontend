import { describe, expect, it } from 'vitest';
import { formatMaybeCents, formatMaybeNumber, UNAVAILABLE } from './currency';
import { describeKnownArrears } from './balance';

describe('formatMaybeCents', () => {
  it('renders unknown and null as unavailable, never zero', () => {
    expect(formatMaybeCents(undefined)).toBe(UNAVAILABLE);
    expect(formatMaybeCents(null)).toBe(UNAVAILABLE);
    expect(formatMaybeCents(Number.NaN)).toBe(UNAVAILABLE);
  });
  it('preserves a verified zero as a real amount', () => {
    const zero = formatMaybeCents(0);
    expect(zero).not.toBe(UNAVAILABLE);
    expect(zero).toMatch(/0/);
  });
  it('renders positive amounts', () => {
    expect(formatMaybeCents(150000)).toMatch(/1,500/);
  });
});

describe('formatMaybeNumber', () => {
  it('distinguishes unknown from zero', () => {
    expect(formatMaybeNumber(undefined)).toBe(UNAVAILABLE);
    expect(formatMaybeNumber(null)).toBe(UNAVAILABLE);
    expect(formatMaybeNumber(0)).toBe('0');
    expect(formatMaybeNumber(12)).toBe('12');
  });
});

describe('describeKnownArrears', () => {
  it('null arrears is unavailable and unverified', () => {
    const d = describeKnownArrears({ knownArrearsCents: null, verifiedFullObligation: true });
    expect(d.value).toBe(UNAVAILABLE);
    expect(d.verified).toBe(false);
    expect(d.caveat).not.toBeNull();
  });
  it('unverified zero is a zero lower bound with a caveat, not "no debt"', () => {
    const d = describeKnownArrears({ knownArrearsCents: 0, verifiedFullObligation: false });
    expect(d.value).not.toBe(UNAVAILABLE);
    expect(d.verified).toBe(false);
    expect(d.caveat).toMatch(/not verified/i);
  });
  it('verified zero has no caveat', () => {
    const d = describeKnownArrears({ knownArrearsCents: 0, verifiedFullObligation: true });
    expect(d.verified).toBe(true);
    expect(d.caveat).toBeNull();
  });
  it('unverified positive shows a caveat; verified positive does not', () => {
    expect(describeKnownArrears({ knownArrearsCents: 500000, verifiedFullObligation: false }).caveat).not.toBeNull();
    expect(describeKnownArrears({ knownArrearsCents: 500000, verifiedFullObligation: true }).caveat).toBeNull();
  });
  it('missing verification flag is treated as unverified', () => {
    expect(describeKnownArrears({ knownArrearsCents: 100, verifiedFullObligation: undefined }).verified).toBe(false);
  });
});
