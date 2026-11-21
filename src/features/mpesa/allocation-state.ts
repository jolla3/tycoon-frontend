import type { MpesaAllocationState } from '@/lib/api/mpesa-transactions';

const REASONS: Record<string, string> = {
  reference_missing: 'No account reference was supplied',
  reference_malformed: 'The account reference is not a valid Tycoon reference',
  reference_unknown: 'The account reference is not known for this shortcode',
  reference_retired: 'The reference belongs to a closed tenancy — needs review',
  reference_scope_mismatch: 'The reference does not belong to this merchant',
  estate_mapping_inactive: 'The reference\'s estate is no longer mapped to this shortcode',
  tenancy_not_active: 'The tenancy for this reference is not active',
  tenancy_identity_mismatch: 'The reference does not match its tenancy',
  not_paybill_merchant: 'Till receipts are matched from tenant SMS evidence',
};

export function allocationLabel(state: MpesaAllocationState): string {
  switch (state) {
    case 'ALLOCATED_BY_REFERENCE': return 'Allocated by reference';
    case 'ALLOCATED_BY_EVIDENCE': return 'Allocated by evidence';
    default: return 'Unallocated';
  }
}

export function allocationReasonText(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return REASONS[reason] ?? 'Needs review';
}

/** Allocation is routing, never proof of a posted rent payment. */
export function isRentPosted(row: { postingState: string }): boolean {
  return row.postingState === 'POSTED';
}
