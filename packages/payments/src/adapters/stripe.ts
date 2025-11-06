import Stripe from 'stripe';
import {
  PaymentAdapter,
  PaymentIntent,
  PaymentResult,
  RefundRequest,
  RefundResult,
  WebhookEvent,
  PaymentStatus,
} from '../types';

interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
}

export class StripeAdapter extends PaymentAdapter {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(config: StripeConfig) {
    super();
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2023-10-16',
    });
    this.webhookSecret = config.webhookSecret;
  }

  async createPayment(intent: PaymentIntent): Promise<PaymentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: intent.amount,
        currency: intent.currency.toLowerCase(),
        description: intent.description,
        metadata: {
          orderId: intent.orderId,
          customerId: intent.customerId || '',
          ...intent.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        paymentId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status),
        amount: paymentIntent.amount,
        currency: intent.currency,
        checkoutUrl: paymentIntent.client_secret
          ? `${process.env.NEXT_PUBLIC_BASE_URL}/checkout?payment_intent=${paymentIntent.id}&payment_intent_client_secret=${paymentIntent.client_secret}`
          : undefined,
      };
    } catch (error) {
      return {
        success: false,
        paymentId: '',
        status: 'failed',
        amount: intent.amount,
        currency: intent.currency,
        error: error instanceof Error ? error.message : 'Failed to create Stripe payment',
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);

      return {
        success: true,
        paymentId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status),
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase() as 'CHF' | 'EUR' | 'USD',
      };
    } catch (error) {
      return {
        success: false,
        paymentId,
        status: 'failed',
        amount: 0,
        currency: 'CHF',
        error: error instanceof Error ? error.message : 'Failed to get Stripe payment status',
      };
    }
  }

  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: request.paymentId,
        amount: request.amount,
        reason: request.reason as Stripe.RefundCreateParams.Reason | undefined,
      });

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount,
        status: this.mapRefundStatus(refund.status),
      };
    } catch (error) {
      return {
        success: false,
        refundId: '',
        amount: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to process Stripe refund',
      };
    }
  }

  async verifyWebhook(payload: string | Buffer, signature: string): Promise<WebhookEvent> {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);

      let paymentId = '';
      let amount = 0;
      let status: PaymentStatus = 'pending';

      switch (event.type) {
        case 'payment_intent.succeeded':
          {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            paymentId = paymentIntent.id;
            amount = paymentIntent.amount;
            status = 'succeeded';
          }
          break;
        case 'payment_intent.payment_failed':
          {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            paymentId = paymentIntent.id;
            amount = paymentIntent.amount;
            status = 'failed';
          }
          break;
        case 'charge.refunded':
          {
            const charge = event.data.object as Stripe.Charge;
            paymentId = charge.payment_intent as string;
            amount = charge.amount_refunded;
            status = 'refunded';
          }
          break;
        default:
          throw new Error(`Unhandled event type: ${event.type}`);
      }

      return {
        provider: 'stripe',
        eventType: event.type,
        paymentId,
        status,
        amount,
        rawData: event,
      };
    } catch (error) {
      throw new Error(
        `Webhook verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private mapStripeStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      requires_payment_method: 'pending',
      requires_confirmation: 'pending',
      requires_action: 'pending',
      processing: 'processing',
      succeeded: 'succeeded',
      canceled: 'cancelled',
    };

    return statusMap[status] || 'failed';
  }

  private mapRefundStatus(status: string | null): 'pending' | 'succeeded' | 'failed' {
    if (status === 'succeeded') return 'succeeded';
    if (status === 'failed') return 'failed';
    return 'pending';
  }
}
