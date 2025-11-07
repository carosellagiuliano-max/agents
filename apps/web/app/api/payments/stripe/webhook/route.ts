import crypto from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { eq, schema } from '@schnittwerk/db';

import { getDatabase } from '@/lib/db';
import { enqueueReconciliationJob } from '@/lib/payments/reconciliation';

type StripeEvent = {
  type: string;
  data: {
    object: {
      id: string;
      status?: string;
    };
  };
};

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) {
    return false;
  }

  const fields = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});

  const timestamp = fields['t'];
  const signature = fields['v1'];

  if (!timestamp || !signature) {
    return false;
  }

  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  try {
    const provided = Buffer.from(signature, 'hex');
    const computed = Buffer.from(expected, 'hex');
    return crypto.timingSafeEqual(new Uint8Array(provided), new Uint8Array(computed));
  } catch (error) {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'missing configuration' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get('stripe-signature');

  if (!verifySignature(rawBody, signatureHeader, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as StripeEvent;
  const intentId = event.data?.object?.id;

  if (!intentId) {
    return NextResponse.json({ ok: true });
  }

  const db = getDatabase();
  const payment = await db.query.payments.findFirst({
    where: (payments, { eq: eqPayment }) => eqPayment(payments.providerPaymentId, intentId),
    columns: { id: true, orderId: true },
  });

  if (!payment) {
    return NextResponse.json({ ok: true });
  }

  const now = new Date();

  if (event.type === 'payment_intent.succeeded') {
    await db.transaction(async (tx) => {
      await tx
        .update(schema.payments)
        .set({ status: 'captured', capturedAt: now, updatedAt: now })
        .where(eq(schema.payments.id, payment.id));

      if (payment.orderId) {
        await tx.update(schema.orders).set({ status: 'paid', updatedAt: now }).where(eq(schema.orders.id, payment.orderId));
      }
    });
    await enqueueReconciliationJob(payment.id);
    return NextResponse.json({ ok: true });
  }

  if (event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
    await db
      .update(schema.payments)
      .set({ status: 'failed', updatedAt: now })
      .where(eq(schema.payments.id, payment.id));
    await enqueueReconciliationJob(payment.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
