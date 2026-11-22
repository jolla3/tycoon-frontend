import { describe, expect, it, vi, beforeEach } from 'vitest';

const post = vi.fn();
vi.mock('./client', () => ({ apiClient: { post: (...a: unknown[]) => post(...a), get: vi.fn() } }));

import { bankConnectionsApi, toCoopCredentialBody } from './bank-connections';

beforeEach(() => post.mockReset());

describe('Co-op credential contract', () => {
  it('sends only consumerKey and consumerSecret, even if extra fields are smuggled in', async () => {
    const dirty = { consumerKey: ' ck ', consumerSecret: ' sk ', clientId: 'x', username: 'u', password: 'p', scope: 's' } as never;
    await bankConnectionsApi.create({ provider: 'COOP', displayName: 'Main', credentialMaterial: dirty });
    const body = post.mock.calls[0]![1];
    expect(body).toEqual({ provider: 'COOP', displayName: 'Main', credentialMaterial: { consumerKey: 'ck', consumerSecret: 'sk' } });
  });

  it('reauthorize uses the same strict body', async () => {
    await bankConnectionsApi.reauthorize('c1', { consumerKey: 'a', consumerSecret: 'b', scope: 'z' } as never);
    expect(post.mock.calls[0]![1]).toEqual({ credentialMaterial: { consumerKey: 'a', consumerSecret: 'b' } });
  });

  it('toCoopCredentialBody has exactly two keys', () => {
    expect(Object.keys(toCoopCredentialBody({ consumerKey: 'a', consumerSecret: 'b' })).sort()).toEqual(['consumerKey', 'consumerSecret']);
  });
});
