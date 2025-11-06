import { PaymentAdapter, PaymentProvider } from './types';
import { SumUpAdapter } from './adapters/sumup';
import { StripeAdapter } from './adapters/stripe';

export function createPaymentAdapter(provider?: PaymentProvider): PaymentAdapter {
  const selectedProvider =
    provider || (process.env.PRIMARY_PAYMENT_PROVIDER as PaymentProvider) || 'sumup';

  switch (selectedProvider) {
    case 'sumup':
      if (!process.env.SUMUP_CLIENT_ID || !process.env.SUMUP_CLIENT_SECRET) {
        throw new Error(
          'SumUp credentials not configured. Set SUMUP_CLIENT_ID and SUMUP_CLIENT_SECRET.'
        );
      }
      return new SumUpAdapter({
        clientId: process.env.SUMUP_CLIENT_ID,
        clientSecret: process.env.SUMUP_CLIENT_SECRET,
      });

    case 'stripe':
      if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error(
          'Stripe credentials not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.'
        );
      }
      return new StripeAdapter({
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      });

    case 'terminal':
    case 'cash':
      // For terminal and cash payments, no external adapter needed
      // These are handled directly in the order flow
      throw new Error(`${selectedProvider} payments handled directly, no adapter needed`);

    default:
      throw new Error(`Unsupported payment provider: ${selectedProvider}`);
  }
}
