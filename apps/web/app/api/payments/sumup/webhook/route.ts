import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@schnittwerk/db';
import { eq } from 'drizzle-orm';
import { createPaymentAdapter } from '@schnittwerk/payments';
import { createRequestLogger, getRequestId } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  const logger = createRequestLogger(requestId);

  try {
    const signature = request.headers.get('x-sumup-signature');
    if (!signature) {
      logger.warn('Missing SumUp signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const body = await request.text();

    // Verify webhook signature
    const adapter = createPaymentAdapter('sumup');
    const event = await adapter.verifyWebhook(body, signature);

    logger.info('SumUp webhook received', {
      eventType: event.eventType,
      paymentId: event.paymentId,
      status: event.status,
    });

    // Process payment update in transaction
    await db.transaction(async (tx) => {
      // Find payment record
      const payment = await tx.query.payments.findFirst({
        where: eq(schema.payments.providerPaymentId, event.paymentId),
      });

      if (!payment) {
        logger.warn('Payment not found', { paymentId: event.paymentId });
        return;
      }

      // Idempotency check - skip if already processed
      if (payment.status === event.status) {
        logger.info('Payment already in this status, skipping', {
          paymentId: event.paymentId,
          status: event.status,
        });
        return;
      }

      // Update payment status
      await tx
        .update(schema.payments)
        .set({
          status: event.status,
          updatedAt: new Date(),
        })
        .where(eq(schema.payments.id, payment.id));

      // Update order status based on payment
      if (payment.orderId) {
        if (event.status === 'succeeded') {
          await tx
            .update(schema.orders)
            .set({
              status: 'paid',
              updatedAt: new Date(),
            })
            .where(eq(schema.orders.id, payment.orderId));
        } else if (event.status === 'failed' || event.status === 'cancelled') {
          await tx
            .update(schema.orders)
            .set({
              status: 'cancelled',
              updatedAt: new Date(),
            })
            .where(eq(schema.orders.id, payment.orderId));
        }
      }

      // Log to audit trail
      await tx.insert(schema.auditLog).values({
        action: `payment_${event.status}`,
        entityType: 'payment',
        entityId: payment.id,
        userId: null,
        metadata: JSON.stringify({
          provider: 'sumup',
          eventType: event.eventType,
          paymentId: event.paymentId,
        }),
        createdAt: new Date(),
      });

      logger.info('Payment status updated', {
        paymentId: payment.id,
        oldStatus: payment.status,
        newStatus: event.status,
      });
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    logger.error('SumUp webhook processing failed', { error });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
