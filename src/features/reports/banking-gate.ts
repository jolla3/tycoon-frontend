// Authoritative BANKING entitlement for report surfaces.
//
// Only a SUCCESSFUL subscription response can enable or disable Banking.
// Loading, error, or a missing response is UNKNOWN, and unknown is never treated
// as enabled (so no Banking figure is shown) and never as zero.
import type { SubscriptionView } from '@/lib/api/subscription';

export type BankingGate = 'enabled' | 'disabled' | 'unknown';

export function bankingGate(q: { isSuccess: boolean; data?: SubscriptionView | null }): BankingGate {
  if (!q.isSuccess || !q.data) return 'unknown';
  const products = q.data.subscription?.products;
  if (!Array.isArray(products)) {
    // A successful answer with no subscription record means no products are assigned.
    return q.data.subscription === null ? 'disabled' : 'unknown';
  }
  return products.includes('BANKING') ? 'enabled' : 'disabled';
}
