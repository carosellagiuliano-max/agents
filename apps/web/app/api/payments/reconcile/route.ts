import { NextRequest, NextResponse } from 'next/server';

import { eq, schema } from '@schnittwerk/db';

import { getDatabase } from '@/lib/db';

async function popReconciliationJob() {
  const baseUrl = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;
  if (!baseUrl || !token) {
    return null;
  }

  const response = await fetch(`${baseUrl}/lpop/queue:payments:reconcile`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to pop reconciliation job: ${response.status}`);
  }

  const payload = (await response.json()) as { result: string | null };
  return payload.result;
}

export async function POST(_request: NextRequest) {
  try {
    const paymentId = await popReconciliationJob();
    if (!paymentId) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    const db = getDatabase();
    const payment = await db.query.payments.findFirst({
      where: (payments, { eq: eqPayment }) => eqPayment(payments.id, paymentId),
      columns: { id: true, metadata: true },
    });

    if (!payment) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    const existingMetadata = (payment.metadata ?? {}) as Record<string, unknown>;
    const metadata = {
      ...existingMetadata,
      reconciled_at: new Date().toISOString(),
    };

    await db.update(schema.payments).set({ metadata }).where(eq(schema.payments.id, paymentId));

    return NextResponse.json({ ok: true, processed: 1 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'failed' }, { status: 500 });
  }
}
