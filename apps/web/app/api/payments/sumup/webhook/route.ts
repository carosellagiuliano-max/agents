import { NextRequest, NextResponse } from 'next/server';

import { eq, schema } from '@schnittwerk/db';

import { getDatabase } from '@/lib/db';
import { enqueueReconciliationJob } from '@/lib/payments/reconciliation';

type SumUpWebhook = {
  event_type: string;
  data: {
    id: string;
    status: string;
    checkout_reference?: string;
  };
};

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.SUMUP_WEBHOOK_SECRET;
  if (!secret) {
    return true;
  }
  const header = request.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const payload = (await request.json()) as SumUpWebhook;
  if (!payload?.data?.id) {
    return NextResponse.json({ ok: true });
  }

  const db = getDatabase();
  const payment = await db.query.payments.findFirst({
    where: (payments, { eq: eqPayment }) => eqPayment(payments.providerPaymentId, payload.data.id),
    columns: { id: true, orderId: true, status: true },
  });

  if (!payment) {
    return NextResponse.json({ ok: true });
  }

  const normalizedStatus = payload.data.status?.toUpperCase();
  const now = new Date();

  if (normalizedStatus === 'PAID') {
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

  if (normalizedStatus === 'FAILED' || normalizedStatus === 'CANCELED') {
    await db
      .update(schema.payments)
      .set({ status: 'failed', updatedAt: now })
      .where(eq(schema.payments.id, payment.id));
    await enqueueReconciliationJob(payment.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
