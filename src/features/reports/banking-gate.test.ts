import { describe, expect, it } from 'vitest';
import { bankingGate } from './banking-gate';
import type { SubscriptionView } from '@/lib/api/subscription';

const view = (products: unknown): SubscriptionView => ({
  subscription: products === null ? null : ({ id: 's', clientId: 'c', plan: 'basic', status: 'active', products } as never),
  plans: [],
});

describe('bankingGate', () => {
  it('enabled only with BANKING in a successful response', () => {
    expect(bankingGate({ isSuccess: true, data: view(['BANKING']) })).toBe('enabled');
    expect(bankingGate({ isSuccess: true, data: view(['BANKING', 'MPESA']) })).toBe('enabled');
  });
  it('disabled when products lack BANKING (including empty) or there is no subscription', () => {
    expect(bankingGate({ isSuccess: true, data: view(['MPESA']) })).toBe('disabled');
    expect(bankingGate({ isSuccess: true, data: view([]) })).toBe('disabled');
    expect(bankingGate({ isSuccess: true, data: view(null) })).toBe('disabled');
  });
  it('unknown while loading, on error, or on a malformed answer; never enabled', () => {
    expect(bankingGate({ isSuccess: false })).toBe('unknown');
    expect(bankingGate({ isSuccess: false, data: view(['BANKING']) })).toBe('unknown');
    expect(bankingGate({ isSuccess: true, data: undefined })).toBe('unknown');
    expect(bankingGate({ isSuccess: true, data: view('BANKING') })).toBe('unknown');
  });
});
