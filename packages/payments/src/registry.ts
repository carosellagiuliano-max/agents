import type { PaymentAdapter, PaymentContext, PaymentIntent, PaymentResult } from './types';

type Registry = Map<PaymentAdapter['provider'], PaymentAdapter>;

export function createPaymentAdapterRegistry(adapters: PaymentAdapter[]): {
  register(adapter: PaymentAdapter): void;
  resolve(provider: PaymentAdapter['provider']): PaymentAdapter;
  createIntent(
    provider: PaymentAdapter['provider'],
    intent: PaymentIntent,
    context: PaymentContext,
  ): Promise<PaymentResult>;
} {
  const registry: Registry = new Map();
  adapters.forEach((adapter) => {
    registry.set(adapter.provider, adapter);
  });

  return {
    register(adapter: PaymentAdapter) {
      registry.set(adapter.provider, adapter);
    },
    resolve(provider: PaymentAdapter['provider']) {
      const adapter = registry.get(provider);
      if (!adapter) {
        throw new Error(`Unknown payment provider: ${provider}`);
      }
      return adapter;
    },
    async createIntent(provider, intent, context) {
      const adapter = this.resolve(provider);
      return adapter.createIntent(intent, context);
    },
  };
}
