import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStripeAdapter } from '../src/adapters/stripe';

const TEST_CONFIG = {
  apiBaseUrl: 'https://api.test-stripe.local/v1',
  secretKey: 'sk_test_123',
  returnUrl: 'https://example.com/return',
};

describe('Stripe adapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a payment intent and returns redirect URL when further action required', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'pi_123',
          status: 'requires_action',
          next_action: { type: 'redirect_to_url', redirect_to_url: { url: 'https://stripe.test/next' } },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = createStripeAdapter(TEST_CONFIG);
    const result = await adapter.createIntent(
      { id: 'intent-1', amount: 12500, description: 'Order #1', metadata: { orderId: 'order-1' } },
      { currency: 'CHF', locale: 'de-CH', requestId: 'req-1' },
    );

    expect(result).toEqual({
      status: 'requires_action',
      redirectUrl: 'https://stripe.test/next',
      providerReference: 'pi_123',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestInit?.headers).toMatchObject({ Authorization: 'Bearer sk_test_123', 'Idempotency-Key': 'intent-1' });
    const body = new URLSearchParams((requestInit?.body as string) ?? '');
    expect(body.get('metadata[orderId]')).toBe('order-1');
  });

  it('returns success result when payment intent is succeeded', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'pi_456',
          status: 'succeeded',
          charges: { data: [{ receipt_url: 'https://stripe.test/receipt' }] },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = createStripeAdapter(TEST_CONFIG);
    const result = await adapter.createIntent(
      { id: 'intent-2', amount: 4500, description: 'Order #2' },
      { currency: 'CHF', locale: 'de-CH', requestId: 'req-2' },
    );

    expect(result).toEqual({
      status: 'succeeded',
      receiptUrl: 'https://stripe.test/receipt',
      providerReference: 'pi_456',
    });
  });
});
