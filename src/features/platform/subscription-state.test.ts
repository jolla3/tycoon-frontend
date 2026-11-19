import { describe, expect, it } from 'vitest';
import { productsOf, subscriptionState } from './subscription-state';

describe('subscriptionState', () => {
  it('treats the backend { present: false } object as MISSING (it is truthy)', () => {
    const row = { subscription: { present: false } as const, products: [] };
    expect(Boolean(row.subscription)).toBe(true);
    expect(subscriptionState(row)).toBe('MISSING');
    expect(productsOf(row)).toEqual([]);
  });
  it('distinguishes a subscription with products: [] from a missing one', () => {
    expect(subscriptionState({ subscription: { present: true, plan: 'trial', status: 'active' }, products: [] })).toBe('NO_PRODUCTS');
    expect(subscriptionState({ subscription: { present: true, plan: 'trial', status: 'active', products: [] } })).toBe('NO_PRODUCTS');
  });
  it('reports assigned products from the row (list) or the subscription (detail)', () => {
    expect(subscriptionState({ subscription: { present: true, plan: 'pro', status: 'active' }, products: ['BANKING'] })).toBe('ASSIGNED');
    expect(productsOf({ subscription: { present: true, plan: 'pro', status: 'active', products: ['MPESA'] } })).toEqual(['MPESA']);
  });
  it('ignores row-level products when there is no subscription', () => {
    expect(productsOf({ subscription: { present: false }, products: ['BANKING'] })).toEqual([]);
  });
  it('tolerates a missing subscription field', () => {
    expect(subscriptionState({})).toBe('MISSING');
  });
});
