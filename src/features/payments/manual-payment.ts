// Pure rules for the simplified manual-payment dialog.
// Ownership (House → Tenancy → Tenant) is resolved by the backend from paymentDate.
import type { ManualPaymentInput, TenderMethod } from '@/lib/api/payments';

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

export function buildManualPaymentInput(args: {
  houseId: string;
  amountKes: string;
  paymentDate: string;
  tenderMethod: TenderMethod | '';
  reference: string;
}): ManualPaymentInput {
  const amountCents = Math.round(Number(args.amountKes) * 100);
  if (!args.houseId) throw new Error('Select a house');
  if (!args.paymentDate || !/^\d{4}-\d{2}-\d{2}$/.test(args.paymentDate)) {
    throw new Error('Choose a valid payment date');
  }
  if (!args.tenderMethod) throw new Error('Choose a payment method');
  if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error('Enter a positive amount');
  return {
    houseId: args.houseId,
    amountCents,
    paymentDate: args.paymentDate,
    tenderMethod: args.tenderMethod,
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
