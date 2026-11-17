// src/lib/formatting/currency.ts
//
// The ONE currency formatter. Mirrors src/utils/money.js on the backend:
// amounts arrive from the API as integer cents, never floats.
export function formatCents(cents: number, currency = 'KES'): string {
  const amount = Math.round(cents) / 100;
  return `${currency} ${amount.toLocaleString('en-KE')}`;
}

/**
 * For fields the backend stores as a plain currency number, NOT integer
 * cents — e.g. House.monthlyRent (see House.js: `monthlyRent: Number`,
 * validated as `z.number().positive()`). Do not use this for
 * Payment.amountCents / RentCharge.amountDueCents / anything from
 * /reports/* — those are cents and must go through formatCents.
 */
export function formatAmount(amount: number, currency = 'KES'): string {
  return `${currency} ${amount.toLocaleString('en-KE')}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-KE');
}

export const UNAVAILABLE = 'Not available';

/**
 * Money that may legitimately be unknown. `0` is a real zero balance and renders
 * as a zero amount; `null`/`undefined` means the backend did not provide or could
 * not verify the figure and renders as "Not available". Never coerce with `?? 0`.
 */
export function formatMaybeCents(cents: number | null | undefined, currency = 'KES'): string {
  return typeof cents === 'number' && Number.isFinite(cents) ? formatCents(cents, currency) : UNAVAILABLE;
}

export function formatMaybeNumber(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? formatNumber(value) : UNAVAILABLE;
}
