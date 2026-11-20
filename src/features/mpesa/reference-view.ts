// Pure presentation rules for a tenant's PayBill collection references.
// The backend decides identity, scope and whether a reference may be issued (`canIssue`);
// this only decides what the operator sees and what text they copy.
import type { TenantReferenceMerchant, TenantReferenceTenancy } from '@/lib/api/mpesa-collection';

export type ReferenceDisplayState = 'ACTIVE' | 'NONE_ISSUABLE' | 'NONE_CLOSED' | 'RETIRED_ONLY';

export function referenceState(m: TenantReferenceMerchant, tenancy: Pick<TenantReferenceTenancy, 'status'>): ReferenceDisplayState {
  if (m.active) return 'ACTIVE';
  if (m.canIssue) return 'NONE_ISSUABLE';
  if (tenancy.status === 'CLOSED' && m.retiredCount > 0) return 'RETIRED_ONLY';
  return 'NONE_CLOSED';
}

/** What to tell the tenant. Only ever built from an ACTIVE reference; retired ones are never instructions. */
export function paymentInstruction(m: TenantReferenceMerchant): string | null {
  if (!m.active) return null;
  return `M-PESA > Lipa na M-PESA > Pay Bill. Business number: ${m.businessShortCode}. Account number: ${m.active.reference}.`;
}

export const STATE_NOTE: Record<ReferenceDisplayState, string> = {
  ACTIVE: 'Active. Use this account number for this tenancy only.',
  NONE_ISSUABLE: 'No reference issued yet for this tenancy.',
  NONE_CLOSED: 'This tenancy is closed. No reference can be issued.',
  RETIRED_ONLY: 'This tenancy is closed. Its reference is retired and must not be used.',
};
