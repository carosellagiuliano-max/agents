import axios from 'axios';
import crypto from 'crypto';
import {
  PaymentAdapter,
  PaymentIntent,
  PaymentResult,
  RefundRequest,
  RefundResult,
  WebhookEvent,
  PaymentStatus,
} from '../types';

interface SumUpConfig {
  clientId: string;
  clientSecret: string;
  apiUrl?: string;
}

interface SumUpCheckout {
  id: string;
  checkout_reference: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
}

export class SumUpAdapter extends PaymentAdapter {
  private config: SumUpConfig;
  private accessToken: string | null = null;

  constructor(config: SumUpConfig) {
    super();
    this.config = {
      ...config,
      apiUrl: config.apiUrl || 'https://api.sumup.com/v0.1',
    };
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        'https://api.sumup.com/token',
        {
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      this.accessToken = response.data.access_token;
      if (!this.accessToken) {
        throw new Error('No access token received from SumUp');
      }
      return this.accessToken;
    } catch (error) {
      throw new Error(
        `SumUp authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async createPayment(intent: PaymentIntent): Promise<PaymentResult> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post<SumUpCheckout>(
        `${this.config.apiUrl}/checkouts`,
        {
          checkout_reference: intent.orderId,
          amount: (intent.amount / 100).toFixed(2),
          currency: intent.currency,
          pay_to_email: process.env.SUMUP_MERCHANT_EMAIL || '',
          description: intent.description || `Order ${intent.orderId}`,
          return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${intent.orderId}/confirmation`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        paymentId: response.data.id,
        status: this.mapSumUpStatus(response.data.status),
        amount: intent.amount,
        currency: intent.currency,
        checkoutUrl: `https://checkout.sumup.com/${response.data.id}`,
      };
    } catch (error) {
      return {
        success: false,
        paymentId: '',
        status: 'failed',
        amount: intent.amount,
        currency: intent.currency,
        error: error instanceof Error ? error.message : 'Failed to create SumUp payment',
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResult> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get<SumUpCheckout>(
        `${this.config.apiUrl}/checkouts/${paymentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return {
        success: true,
        paymentId: response.data.id,
        status: this.mapSumUpStatus(response.data.status),
        amount: Math.round(
          (typeof response.data.amount === 'string'
            ? parseFloat(response.data.amount)
            : response.data.amount) * 100
        ),
        currency: response.data.currency as 'CHF' | 'EUR' | 'USD',
      };
    } catch (error) {
      return {
        success: false,
        paymentId,
        status: 'failed',
        amount: 0,
        currency: 'CHF',
        error: error instanceof Error ? error.message : 'Failed to get SumUp payment status',
      };
    }
  }

  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    try {
      const token = await this.getAccessToken();

      // SumUp refunds are processed through transactions API
      const response = await axios.post(
        `${this.config.apiUrl}/me/refund/${request.paymentId}`,
        request.amount ? { amount: (request.amount / 100).toFixed(2) } : undefined,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        refundId: response.data.id || request.paymentId,
        amount: request.amount || 0,
        status: 'succeeded',
      };
    } catch (error) {
      return {
        success: false,
        refundId: '',
        amount: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to process SumUp refund',
      };
    }
  }

  async verifyWebhook(payload: string | Buffer, signature: string): Promise<WebhookEvent> {
    const payloadString = typeof payload === 'string' ? payload : payload.toString();

    // Verify SumUp webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', this.config.clientSecret)
      .update(payloadString)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }

    const event = JSON.parse(payloadString);

    return {
      provider: 'sumup',
      eventType: event.event_type || 'checkout.completed',
      paymentId: event.id,
      status: this.mapSumUpStatus(event.status),
      amount: event.amount ? Math.round(parseFloat(event.amount) * 100) : 0,
      rawData: event,
    };
  }

  private mapSumUpStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      PENDING: 'pending',
      PAID: 'succeeded',
      FAILED: 'failed',
      CANCELLED: 'cancelled',
    };

    return statusMap[status] || 'pending';
  }
}
