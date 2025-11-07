import type { PaymentAdapter, PaymentContext, PaymentIntent, PaymentResult } from '../types';

type StripeAdapterConfig = {
  apiBaseUrl?: string;
  secretKey?: string;
  returnUrl?: string;
};

async function createPaymentIntent(
  intent: PaymentIntent,
  context: PaymentContext,
  config: StripeAdapterConfig,
): Promise<PaymentResult> {
  const apiBaseUrl = config.apiBaseUrl ?? 'https://api.stripe.com/v1';
  const secretKey = config.secretKey ?? process.env.STRIPE_SECRET_KEY;
  const returnUrl = config.returnUrl ?? process.env.STRIPE_RETURN_URL ?? `${process.env.NEXT_PUBLIC_BASE_URL}/payments/stripe/return`;

  if (!secretKey) {
    throw new Error('Stripe adapter requires STRIPE_SECRET_KEY');
  }

  if (!returnUrl) {
    throw new Error('Stripe adapter requires STRIPE_RETURN_URL or NEXT_PUBLIC_BASE_URL');
  }

  const body = new URLSearchParams({
    amount: intent.amount.toString(),
    currency: context.currency.toLowerCase(),
    description: intent.description,
    confirmation_method: 'automatic',
    confirm: 'true',
    return_url: returnUrl,
  });

  if (intent.metadata) {
    for (const [key, value] of Object.entries(intent.metadata)) {
      body.set(`metadata[${key}]`, value);
    }
  }

  const response = await fetch(`${apiBaseUrl}/payment_intents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': intent.id,
      'Stripe-Version': '2023-10-16',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stripe payment intent failed: ${response.status} ${error}`);
  }

  const payload: {
    id: string;
    status: string;
    next_action?: { type: string; redirect_to_url?: { url?: string } };
    charges?: { data?: Array<{ receipt_url?: string }> };
  } = await response.json();

  if (payload.status === 'succeeded' || payload.status === 'requires_capture') {
    const receiptUrl = payload.charges?.data?.[0]?.receipt_url;
    return { status: 'succeeded', receiptUrl, providerReference: payload.id };
  }

  const redirectUrl = payload.next_action?.redirect_to_url?.url;
  if (!redirectUrl) {
    throw new Error('Stripe requires customer action but did not return a redirect URL');
  }

  return {
    status: 'requires_action',
    redirectUrl,
    providerReference: payload.id,
  };
}

export function createStripeAdapter(config: StripeAdapterConfig = {}): PaymentAdapter {
  return {
    provider: 'stripe',
    async createIntent(intent, context) {
      return createPaymentIntent(intent, context, config);
    },
  };
}
