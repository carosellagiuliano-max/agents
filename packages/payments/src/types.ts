export type PaymentProvider = 'sumup' | 'stripe' | 'terminal' | 'cash';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export type Currency = 'CHF' | 'EUR' | 'USD';

export interface PaymentIntent {
  amount: number; // in cents
  currency: Currency;
  orderId: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: Currency;
  checkoutUrl?: string;
  error?: string;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number; // If not provided, full refund
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed';
  error?: string;
}

export interface WebhookEvent {
  provider: PaymentProvider;
  eventType: string;
  paymentId: string;
  status: PaymentStatus;
  amount?: number;
  rawData: unknown;
}

export abstract class PaymentAdapter {
  abstract createPayment(intent: PaymentIntent): Promise<PaymentResult>;
  abstract getPaymentStatus(paymentId: string): Promise<PaymentResult>;
  abstract refundPayment(request: RefundRequest): Promise<RefundResult>;
  abstract verifyWebhook(payload: string | Buffer, signature: string): Promise<WebhookEvent>;
}
