import { describe, expect, it, vi } from 'vitest';
import { createPaymentAdapterRegistry } from './registry';
import type { PaymentAdapter, PaymentContext, PaymentIntent } from './types';

describe('createPaymentAdapterRegistry', () => {
  const context: PaymentContext = { currency: 'CHF', locale: 'de-CH', requestId: 'test' };
  const intent: PaymentIntent = { id: 'order-1', amount: 12000, description: 'Haarschnitt' };

  it('resolves registered adapters', async () => {
    const createIntent = vi.fn(async () => ({ status: 'succeeded' as const }));
    const registry = createPaymentAdapterRegistry([
      { provider: 'sumup', createIntent } satisfies PaymentAdapter,
    ]);

    const adapter = registry.resolve('sumup');
    await adapter.createIntent(intent, context);

    expect(createIntent).toHaveBeenCalledWith(intent, context);
  });

  it('throws for unknown provider', () => {
    const registry = createPaymentAdapterRegistry([]);
    expect(() => registry.resolve('stripe')).toThrowError('Unknown payment provider: stripe');
  });

  it('delegates createIntent helper', async () => {
    const createIntent = vi.fn(async () => ({ status: 'requires_action' as const, redirectUrl: 'https://example.com' }));
    const registry = createPaymentAdapterRegistry([
      { provider: 'stripe', createIntent } satisfies PaymentAdapter,
    ]);

    const result = await registry.createIntent('stripe', intent, context);
    expect(result).toEqual({ status: 'requires_action', redirectUrl: 'https://example.com' });
  });
});
