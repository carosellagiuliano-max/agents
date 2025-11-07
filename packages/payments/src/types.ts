export type PaymentContext = {
  currency: 'CHF' | 'EUR';
  locale: 'de-CH';
  requestId: string;
};

export type PaymentIntent = {
  id: string;
  amount: number;
  description: string;
  metadata?: Record<string, string>;
};

export type PaymentResult =
  | { status: 'requires_action'; redirectUrl: string; providerReference: string }
  | { status: 'succeeded'; receiptUrl?: string; providerReference: string };

export type PaymentAdapter = {
  provider: 'sumup' | 'stripe';
  createIntent(intent: PaymentIntent, context: PaymentContext): Promise<PaymentResult>;
};
