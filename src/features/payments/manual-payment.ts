// Pure rules for the simplified manual-payment dialog and legacy tenancy-chooser helpers.
// Ownership (House → Tenancy → Tenant) is resolved by the backend from paymentDate for the ordinary flow.
import type { EligibleSelection, ManualPaymentInput, ManualPaymentOptions, TenancyOption, TenderMethod } from '@/lib/api/payments';

export const ELIGIBLE_PAGE_SIZE = 10;
export const SEARCH_MAX = 80;

export const TENDER_METHODS: { value: TenderMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MPESA', label: 'M-PESA' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

/** Nairobi calendar date YYYY-MM-DD for "today". */
export function nairobiToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
}

/** One stable submission identity for a single intended record attempt. */
export function newManualPaymentIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export type TenancyChoiceState =
  | { kind: 'loading' }
  | { kind: 'unique'; option: TenancyOption }
  | { kind: 'choose'; eligibleTotal: number; selection: EligibleSelection }
  | { kind: 'none'; history: TenancyOption[] };

/**
 * Decide what the dialog shows. Data that belongs to another house/period (kept as placeholder
 * while the next request loads) is treated as loading so stale options can never be shown or sent.
 */
export function resolveChoice(
  options: ManualPaymentOptions | undefined,
  ctx?: { houseId: string; period: string },
): TenancyChoiceState {
  if (!options) return { kind: 'loading' };
  if (ctx && (options.houseId !== ctx.houseId || options.period !== ctx.period)) return { kind: 'loading' };
  const eligible = (options.eligibleSelection?.items ?? []).filter((o) => o.coversPeriod);
  if (options.resolution === 'UNIQUE' && options.defaultTenancyId) {
    const option = eligible.find((o) => o.tenancyId === options.defaultTenancyId);
    if (option) return { kind: 'unique', option };
    return { kind: 'none', history: options.options };
  }
  if (options.resolution === 'AMBIGUOUS' && options.eligibleSelection) {
    return {
      kind: 'choose',
      eligibleTotal: options.eligibleTotal ?? options.eligibleSelection.total,
      selection: { ...options.eligibleSelection, items: eligible },
    };
  }
  return { kind: 'none', history: options.options };
}

/** A chosen tenancy, keyed by its exact id, bound to the house/period it was chosen for. */
export interface TenancySelection { houseId: string; period: string; option: TenancyOption }

export interface DialogState {
  houseId: string;
  period: string;
  search: string;
  page: number;
  selected: TenancySelection | null;
}

export type DialogAction =
  | { type: 'house'; houseId: string }
  | { type: 'period'; period: string }
  | { type: 'search'; search: string }
  | { type: 'page'; page: number }
  | { type: 'select'; option: TenancyOption }
  | { type: 'clear' };

export function initialDialogState(period: string): DialogState {
  return { houseId: '', period, search: '', page: 1, selected: null };
}

export function dialogReducer(s: DialogState, a: DialogAction): DialogState {
  switch (a.type) {
    case 'house':
      return { ...s, houseId: a.houseId, search: '', page: 1, selected: null };
    case 'period':
      return { ...s, period: a.period, search: '', page: 1, selected: null };
    case 'search': {
      const search = a.search.slice(0, SEARCH_MAX);
      return search === s.search ? s : { ...s, search, page: 1 };
    }
    case 'page':
      return { ...s, page: Math.max(1, Math.floor(a.page) || 1) };
    case 'select':
      if (!a.option.coversPeriod) return s;
      return { ...s, selected: { houseId: s.houseId, period: s.period, option: a.option } };
    case 'clear':
      return { ...s, selected: null };
  }
}

/** The selection only counts for the exact house and period it was made for. */
export function activeSelection(s: DialogState): TenancyOption | null {
  const sel = s.selected;
  return sel && sel.houseId === s.houseId && sel.period === s.period ? sel.option : null;
}

/**
 * The tenancy id that will be sent, or null when the form must not submit.
 * `fresh` is false while results are loading/refetching/placeholder, which blocks submission.
 */
export function tenancyToSubmit(state: TenancyChoiceState, selected: TenancyOption | null, fresh = true): string | null {
  if (!fresh) return null;
  if (state.kind === 'unique') return state.option.tenancyId;
  if (state.kind === 'choose') return selected && selected.coversPeriod ? selected.tenancyId : null;
  return null;
}

export function pageCount(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, limit)));
}

export function describeTenancy(o: TenancyOption, fmt: (d: string) => string): string {
  const from = fmt(o.startAt);
  const to = o.endAt ? fmt(o.endAt) : 'present';
  return `${o.tenantName} \u00b7 ${from} \u2013 ${to}${o.status === 'ACTIVE' ? ' (current)' : ''}`;
}

/** Ordinary manual receipt input \u2014 house + receipt; no tenancy/period selector. */
export function buildManualPaymentInput(args: {
  houseId: string;
  amountKes: string;
  paymentDate: string;
  tenderMethod: TenderMethod | '';
  reference: string;
  idempotencyKey: string;
}): ManualPaymentInput {
  const amountCents = Math.round(Number(args.amountKes) * 100);
  if (!args.houseId) throw new Error('Select a house');
  if (!args.paymentDate || !/^\d{4}-\d{2}-\d{2}$/.test(args.paymentDate)) {
    throw new Error('Choose a valid payment date');
  }
  if (!args.tenderMethod) throw new Error('Choose a payment method');
  if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error('Enter a positive amount');
  const key = String(args.idempotencyKey || '').trim();
  if (key.length < 8) throw new Error('Missing submission identity');
  return {
    houseId: args.houseId,
    amountCents,
    paymentDate: args.paymentDate,
    tenderMethod: args.tenderMethod,
    idempotencyKey: key,
    paymentReference: args.reference.trim() || undefined,
  };
}

/** Format ledger balance for display. Returns null when balance is unavailable. */
export function formatTenantBalance(cents: number | null | undefined): string | null {
  if (cents == null || !Number.isFinite(cents)) return null;
  const kes = cents / 100;
  const abs = Math.abs(kes).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (kes < 0) return `KSh ${abs} outstanding`;
  if (kes > 0) return `KSh ${abs} credit`;
  return 'KSh 0.00';
}
