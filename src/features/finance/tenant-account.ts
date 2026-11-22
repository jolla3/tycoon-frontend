import type { TenantAccount } from '@/lib/api/tenants';
import { formatCents, formatMaybeCents, UNAVAILABLE } from '@/lib/formatting/currency';

export interface TenantAccountMetric { key: string; label: string; value: string; }

/** Distinct gross receipts, charge allocations, credit and outstanding rent. */
export function tenantAccountMetrics(account?: TenantAccount | null): TenantAccountMetric[] {
  return [
    { key: 'received', label: 'Total received', value: formatMaybeCents(account?.receivedCents) },
    { key: 'billed', label: 'Total billed', value: formatMaybeCents(account?.billedCents) },
    { key: 'applied', label: 'Applied to rent', value: formatMaybeCents(account?.appliedToRentCents) },
    { key: 'credit', label: 'Available credit', value: formatMaybeCents(account?.creditCents) },
    { key: 'outstanding', label: 'Outstanding rent', value: formatMaybeCents(account?.outstandingCents) },
    { key: 'net', label: 'Net position', value: account
      ? (account.netCents >= 0 ? formatCents(account.netCents) + ' credit' : formatCents(-account.netCents) + ' owed')
      : UNAVAILABLE },
  ];
}
