import { describe, expect, it, vi, beforeEach } from 'vitest';

const getNoStore = vi.fn();
const get = vi.fn();
const post = vi.fn();
vi.mock('./client', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    getNoStore: (...args: unknown[]) => getNoStore(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

import { mpesaCollectionApi } from './mpesa-collection';

beforeEach(() => {
  getNoStore.mockReset();
  get.mockReset();
  post.mockReset();
});

describe('M-PESA submitted evidence API', () => {
  it('fetches original evidence through the authenticated no-store detail endpoint', async () => {
    const controller = new AbortController();
    const result = {
      id: '6b06e558576b552f33dff602',
      available: true,
      unavailableReason: null,
      message: 'Original payer-submitted SMS',
      state: 'UNSUPPORTED',
      stateReason: 'unsupported_template',
      parserVersion: 'mpesa-sms-parser/1',
      template: null,
      parseErrors: ['unsupported_template'],
      createdAt: '2026-11-25T13:40:40.699Z',
    };
    getNoStore.mockResolvedValue(result);

    await expect(mpesaCollectionApi.submissionEvidence(result.id, { clientId: 'client-1' }, controller.signal))
      .resolves.toEqual(result);

    expect(getNoStore).toHaveBeenCalledWith(
      `/mpesa-collection/submissions/${result.id}/evidence`,
      { clientId: 'client-1' },
      controller.signal,
    );
    expect(get).not.toHaveBeenCalled();
  });

  it('does not turn an unavailable retained message into a fabricated string', async () => {
    const result = {
      id: 'submission-1',
      available: false,
      unavailableReason: 'NOT_RETAINED',
      message: null,
      state: 'UNSUPPORTED',
      stateReason: 'unsupported_template',
      parserVersion: 'mpesa-sms-parser/1',
      template: null,
      parseErrors: ['unsupported_template'],
      createdAt: '2026-11-25T13:40:40.699Z',
    };
    getNoStore.mockResolvedValue(result);

    const out = await mpesaCollectionApi.submissionEvidence(result.id);
    expect(out.message).toBeNull();
    expect(out.available).toBe(false);
  });
});
