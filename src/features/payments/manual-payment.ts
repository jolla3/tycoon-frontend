// Pure rules for the manual-payment dialog. The backend (GET /payments/manual-options,
// POST /payments) owns tenancy eligibility; this only decides what the form shows and sends.
// There is deliberately no second eligibility resolver here: the selectable list is the
// server's eligible-only, server-paginated `eligibleSelection`, and the backend revalidates
// the submitted tenancyId at payment creation.
import type { EligibleSelection, ManualPaymentInput, ManualPaymentOptions, TenancyOption } from '@/lib/api/payments';

export const ELIGIBLE_PAGE_SIZE = 10;
export const SEARCH_MAX = 80;

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

export const initialDialogState = (period: string): DialogState => ({ houseId: '', period, search: '', page: 1, selected: null });

export function dialogReducer(s: DialogState, a: DialogAction): DialogState {
  switch (a.type) {
    case 'house':
      return a.houseId === s.houseId ? s : { ...s, houseId: a.houseId, search: '', page: 1, selected: null };
    case 'period':
      return a.period === s.period ? s : { ...s, period: a.period, search: '', page: 1, selected: null };
    case 'search': {
      const search = a.search.slice(0, SEARCH_MAX);
      return search === s.search ? s : { ...s, search, page: 1 }; // selection survives a new search
    }
    case 'page':
      return { ...s, page: Math.max(1, Math.floor(a.page) || 1) };
    case 'select':
      if (!a.option.coversPeriod) return s; // an ineligible tenancy can never be selected
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
  return `${o.tenantName} · ${from} – ${to}${o.status === 'ACTIVE' ? ' (current)' : ''}`;
}

export function buildManualPaymentInput(args: {
  houseId: string;
  period: string;
  amountKes: string;
  reference: string;
  tenancyId: string | null;
}): ManualPaymentInput {
  const amountCents = Math.round(Number(args.amountKes) * 100);
  if (!args.houseId) throw new Error('Select a house');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(args.period)) throw new Error('Choose the rent month this payment is for');
  if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error('Enter a positive amount');
  if (!args.tenancyId) throw new Error('Choose which tenancy this payment is for');
  return {
    houseId: args.houseId,
    period: args.period,
    tenancyId: args.tenancyId,
    amountCents,
    paymentReference: args.reference.trim() || undefined,
  };
}
