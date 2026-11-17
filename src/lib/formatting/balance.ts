// src/lib/formatting/balance.ts
//
// The ONE place a known-arrears figure is turned into display text. Keeps the
// three states distinct: unknown (null), known-and-verified, and known-but-
// unverified (a lower bound). A real zero stays a zero.
import { formatCents, UNAVAILABLE } from './currency';

export interface BalanceDisplay {
  /** Headline text. "Not available" when the backend has no figure. */
  value: string;
  /** Short qualifier to render beneath the value, or null when none is needed. */
  caveat: string | null;
  /** True when the figure is a verified full obligation. */
  verified: boolean;
}

export function describeKnownArrears(input: { knownArrearsCents: number | null | undefined; verifiedFullObligation: boolean | undefined }): BalanceDisplay {
  const { knownArrearsCents, verifiedFullObligation } = input;
  if (typeof knownArrearsCents !== 'number') {
    return { value: UNAVAILABLE, caveat: 'The ledger could not provide a figure.', verified: false };
  }
  if (verifiedFullObligation === true) return { value: formatCents(knownArrearsCents), caveat: null, verified: true };
  return { value: formatCents(knownArrearsCents), caveat: 'Known arrears only. Earlier history is not verified.', verified: false };
}
