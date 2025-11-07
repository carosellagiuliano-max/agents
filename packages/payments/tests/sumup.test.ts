import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSumUpAdapter } from '../src/adapters/sumup';

const TEST_CONFIG = {
  baseUrl: 'https://api.test-sumup.local',
  clientId: 'test-client',
  clientSecret: 'test-secret',
  checkoutRedirectUrl: 'https://example.com/return',
  sellerEmail: 'payments@example.com',
};

describe('SumUp adapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).__sumupToken = undefined;
  });

  it('creates a checkout and returns redirect URL', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'token', expires_in: 60 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'checkout-id',
            checkout_reference: 'intent-1',
            status: 'PENDING',
            redirect_url: 'https://sumup.test/pay',
          }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = createSumUpAdapter(TEST_CONFIG);
    const result = await adapter.createIntent(
      { id: 'intent-1', amount: 12500, description: 'Order #1' },
      { currency: 'CHF', locale: 'de-CH', requestId: 'req-1' },
    );

    expect(result).toEqual({
      status: 'requires_action',
      redirectUrl: 'https://sumup.test/pay',
      providerReference: 'checkout-id',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer token',
      'Idempotency-Key': 'intent-1',
    });
  });

  it('reuses cached token until expiry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'token', expires_in: 3600 }),
      })
      .mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'checkout-id',
            checkout_reference: 'intent-1',
            status: 'PENDING',
            redirect_url: 'https://sumup.test/pay',
          }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = createSumUpAdapter(TEST_CONFIG);

    const first = await adapter.createIntent(
      { id: 'intent-1', amount: 5000, description: 'Order #1' },
      { currency: 'CHF', locale: 'de-CH', requestId: 'req-1' },
    );
    expect(first.providerReference).toBe('checkout-id');

    const second = await adapter.createIntent(
      { id: 'intent-2', amount: 6000, description: 'Order #2' },
      { currency: 'CHF', locale: 'de-CH', requestId: 'req-2' },
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(second.providerReference).toBe('checkout-id');
  });
});
