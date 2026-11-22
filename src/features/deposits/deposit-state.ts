// Pure helpers for the deposit panel (no React) so the conflict and tenancy
// rules can be unit tested.

export interface EligibleTenancy {
  tenancyId: string;
  estateId: string;
  estateName: string | null;
  houseId: string;
  houseNumber: string | null;
  startAt: string | null;
  status: string;
}

export interface RequirementLockedDetails {
  tenancyId?: string;
  requiredCents: number;
  requestedCents: number;
  paidCents: number;
  heldCents?: number;
  refundedCents?: number;
}

export type DepositConflict =
  | { kind: 'requirement_locked'; details: RequirementLockedDetails | null }
  | { kind: 'tenancy_ambiguous' }
  | { kind: 'tenancy_not_eligible' };

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Maps a typed backend 409 to a conflict the UI can render; anything else is not a conflict. */
export function classifyDepositConflict(err: { status?: number; code?: string; details?: unknown } | null | undefined): DepositConflict | null {
  if (!err || err.status !== 409) return null;
  switch (err.code) {
    case 'DEPOSIT_REQUIREMENT_LOCKED': {
      const d = err.details as Partial<RequirementLockedDetails> | undefined;
      const ok = d && isNum(d.requiredCents) && isNum(d.requestedCents) && isNum(d.paidCents);
      return { kind: 'requirement_locked', details: ok ? (d as RequirementLockedDetails) : null };
    }
    case 'DEPOSIT_TENANCY_AMBIGUOUS':
      return { kind: 'tenancy_ambiguous' };
    case 'TENANCY_NOT_ELIGIBLE':
      return { kind: 'tenancy_not_eligible' };
    default:
      return null;
  }
}

export function tenancyLabel(t: EligibleTenancy): string {
  const where = [t.estateName, t.houseNumber ? `House ${t.houseNumber}` : null].filter(Boolean).join(' · ') || 'Tenancy';
  const since = t.startAt ? ` (since ${new Date(t.startAt).toLocaleDateString()})` : '';
  return `${where}${since}`;
}

/**
 * The tenancy every deposit action must target. null means the user has to
 * choose (several eligible) or there is nothing to act on; never guessed.
 */
export function resolveActionTenancyId(opts: {
  ambiguous: boolean;
  selectedTenancyId: string | null;
  activeTenancyId: string | null;
  choices: EligibleTenancy[];
}): string | null {
  if (opts.selectedTenancyId && opts.choices.some((c) => c.tenancyId === opts.selectedTenancyId)) return opts.selectedTenancyId;
  if (opts.selectedTenancyId && !opts.ambiguous && opts.activeTenancyId === opts.selectedTenancyId) return opts.selectedTenancyId;
  if (opts.ambiguous) return null;
  return opts.activeTenancyId;
}
