import type { PaymentAdapter, PaymentContext, PaymentIntent, PaymentResult } from '../types';

type SumUpAccessToken = {
  token: string;
  expiresAt: number;
};

const globalState = globalThis as unknown as {
  __sumupToken?: SumUpAccessToken;
};

type SumUpAdapterConfig = {
  baseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  checkoutRedirectUrl?: string;
  accountId?: string;
  sellerEmail?: string;
};

async function ensureAccessToken(config: SumUpAdapterConfig): Promise<string> {
  const now = Date.now();
  const cached = globalState.__sumupToken;
  if (cached && cached.expiresAt > now + 5_000) {
    return cached.token;
  }

  const baseUrl = config.baseUrl ?? 'https://api.sumup.com';
  const clientId = config.clientId ?? process.env.SUMUP_CLIENT_ID;
  const clientSecret = config.clientSecret ?? process.env.SUMUP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('SumUp adapter requires SUMUP_CLIENT_ID and SUMUP_CLIENT_SECRET');
  }

  const response = await fetch(`${baseUrl}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SumUp token exchange failed: ${response.status} ${error}`);
  }

  const payload: { access_token: string; expires_in: number } = await response.json();
  const token = payload.access_token;
  const expiresAt = now + payload.expires_in * 1000;

  globalState.__sumupToken = { token, expiresAt };
  return token;
}

async function createCheckout(
  intent: PaymentIntent,
  context: PaymentContext,
  config: SumUpAdapterConfig,
): Promise<PaymentResult> {
  const baseUrl = config.baseUrl ?? 'https://api.sumup.com';
  const redirectUrl =
    config.checkoutRedirectUrl ?? process.env.SUMUP_REDIRECT_URL ?? `${process.env.NEXT_PUBLIC_BASE_URL}/payments/sumup/return`;
  const accountId = config.accountId ?? process.env.SUMUP_ACCOUNT_ID;
  const sellerEmail = config.sellerEmail ?? process.env.SUMUP_SELLER_EMAIL ?? process.env.SITE_EMAIL;

  if (!redirectUrl) {
    throw new Error('SumUp adapter requires SUMUP_REDIRECT_URL or NEXT_PUBLIC_BASE_URL');
  }

  if (!accountId && !sellerEmail) {
    throw new Error('SumUp adapter requires either SUMUP_ACCOUNT_ID or SUMUP_SELLER_EMAIL');
  }

  const accessToken = await ensureAccessToken(config);
  const response = await fetch(`${baseUrl}/v0.1/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': intent.id,
      'X-Request-Id': context.requestId,
    },
    body: JSON.stringify({
      checkout_reference: intent.id,
      amount: Number((intent.amount / 100).toFixed(2)),
      currency: context.currency,
      description: intent.description,
      pay_to_email: sellerEmail,
      merchant_code: accountId,
      redirect_url: redirectUrl,
      purpose: 'ecommerce',
      metadata: intent.metadata ?? {},
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SumUp checkout creation failed: ${response.status} ${error}`);
  }

  const checkout: { id: string; checkout_reference: string; status: string; redirect_url?: string } = await response.json();

  if (checkout.status === 'PAID') {
    return { status: 'succeeded', receiptUrl: checkout.redirect_url, providerReference: checkout.id };
  }

  if (!checkout.redirect_url) {
    throw new Error('SumUp checkout missing redirect_url for further action');
  }

  return {
    status: 'requires_action',
    redirectUrl: checkout.redirect_url,
    providerReference: checkout.id,
  };
}

export function createSumUpAdapter(config: SumUpAdapterConfig = {}): PaymentAdapter {
  return {
    provider: 'sumup',
    async createIntent(intent, context) {
      return createCheckout(intent, context, config);
    },
  };
}
