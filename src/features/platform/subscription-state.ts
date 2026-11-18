// A Subscription can be missing, present with no products, or present with products.
// The backend sends `{ present: false }` (truthy!) for a missing one, so callers must
// not test the object itself. Entitlement is a different question: it is decided by
// Client active + Subscription.products only (plan, status and dates are ignored).
import type { PlatformClientSubscription, Product } from '@/lib/api/platform';

export type SubscriptionState = 'MISSING' | 'NO_PRODUCTS' | 'ASSIGNED';

export function subscriptionState(row: { subscription?: PlatformClientSubscription | null; products?: Product[] | null }): SubscriptionState {
  const sub = row.subscription;
  if (!sub || sub.present !== true) return 'MISSING';
  const products = sub.products ?? row.products ?? [];
  return products.length === 0 ? 'NO_PRODUCTS' : 'ASSIGNED';
}

export function productsOf(row: { subscription?: PlatformClientSubscription | null; products?: Product[] | null }): Product[] {
  const sub = row.subscription;
  if (!sub || sub.present !== true) return [];
  return sub.products ?? row.products ?? [];
}

export const ENTITLEMENT_REASON_TEXT: Record<string, string> = {
  SUBSCRIPTION_MISSING: 'No subscription record',
  PRODUCT_NOT_ASSIGNED: 'Subscription exists but this product is not assigned',
  CLIENT_INACTIVE: 'Client is inactive',
  CLIENT_NOT_FOUND: 'Client not found',
  PRODUCT_UNKNOWN: 'Unknown product',
};
