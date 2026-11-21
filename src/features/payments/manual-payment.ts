// Pure rules for the manual-payment dialog. The backend (GET /payments/manual-options,
// POST /payments) owns tenancy eligibility; this only decides what the form shows and sends.
import type { ManualPaymentInput, ManualPaymentOptions, TenancyOption } from '@/lib/api/payments';

export type TenancyChoiceState =
  | { kind: 'loading' }
  | { kind: 'unique'; option: TenancyOption }
  | {
      kind: 'choose';
      /** Bounded sample of covering tenancies (kept for resolution/back-compat). */
      options: TenancyOption[];
      /** Exact number of tenancies that can take this payment. */
      eligibleCount: number;
      /** Exact number of tenancies the house has had (any status), i.e. the browsable set. */
      historicalCount: number | null;
      /** The current browsable page (search/pagination), eligible or not. */
      browse: TenancyOption[];
    }
  | { kind: 'none'; options: TenancyOption[] };

/** Decide what the dialog shows. `selectedTenancyId` only counts when it is a covering option. */
export function resolveChoice(options: ManualPaymentOptions | undefined): TenancyChoiceState {
  if (!options) return { kind: 'loading' };
  // Resolution never depends on which page/search the browsable list is showing.
  const covering = options.eligibleOptions ?? options.options.filter((o) => o.coversPeriod);
  if (options.resolution === 'UNIQUE' && options.defaultTenancyId) {
    const option = covering.find((o) => o.tenancyId === options.defaultTenancyId)
      ?? options.options.find((o) => o.tenancyId === options.defaultTenancyId);
    if (option) return { kind: 'unique', option };
  }
  if (covering.length > 1 || (options.eligibleTotal ?? 0) > 1) {
    return {
      kind: 'choose',
      options: covering,
      eligibleCount: Math.max(options.eligibleTotal ?? 0, covering.length),
      historicalCount: options.total ?? null,
      browse: options.options,
    };
  }
  return { kind: 'none', options: options.options };
}

/** The tenancy id that will be sent, or null when the form must not submit. */
export function tenancyToSubmit(
  state: TenancyChoiceState,
  selectedTenancyId: string,
  /** The option the user picked while browsing; may come from a page that is no longer loaded. */
  selectedOption?: TenancyOption | null
): string | null {
  if (state.kind === 'unique') return state.option.tenancyId;
  if (state.kind === 'choose') {
    if (state.options.some((o) => o.tenancyId === selectedTenancyId)) return selectedTenancyId;
    // Browsed selection: only a tenancy that covers the period counts. The server re-validates it independently.
    if (selectedOption && selectedOption.tenancyId === selectedTenancyId && selectedOption.coversPeriod) return selectedTenancyId;
  }
  return null;
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
