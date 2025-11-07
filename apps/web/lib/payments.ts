import { createPaymentAdapterRegistry, createStripeAdapter, createSumUpAdapter } from '@schnittwerk/payments';

const registry = createPaymentAdapterRegistry([
  createSumUpAdapter(),
  createStripeAdapter(),
]);

export function getPaymentRegistry() {
  return registry;
}
