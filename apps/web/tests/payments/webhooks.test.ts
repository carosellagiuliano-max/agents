import crypto from 'node:crypto';

import { expect, it, beforeEach, afterEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('@/lib/payments/reconciliation', () => ({
  enqueueReconciliationJob: vi.fn(),
}));

import { getDatabase } from '@/lib/db';
import { enqueueReconciliationJob } from '@/lib/payments/reconciliation';

const getDatabaseMock = vi.mocked(getDatabase);

let mockDb = createMockDatabase();

import { POST as stripeWebhook } from '../../app/api/payments/stripe/webhook/route';
import { POST as sumupWebhook } from '../../app/api/payments/sumup/webhook/route';

function createMockDatabase() {
  return {
    query: {
      payments: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
    transaction: vi.fn(),
  };
}

type StripeTestRequest = Pick<NextRequest, 'headers' | 'text'>;
type SumUpTestRequest = Pick<NextRequest, 'headers' | 'json'>;

function createStripeSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDb = createMockDatabase();
  getDatabaseMock.mockReturnValue(mockDb as any);
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.SUMUP_WEBHOOK_SECRET;
});

afterEach(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.SUMUP_WEBHOOK_SECRET;
});

it('rejects Stripe requests with invalid signatures', async () => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  const payload = JSON.stringify({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_123' } } });
  const request: StripeTestRequest = {
    headers: new Headers({ 'stripe-signature': 'invalid' }),
    text: async () => payload,
  } as unknown as NextRequest;

  const response = await stripeWebhook(request as NextRequest);
  expect(response.status).toBe(400);
  expect(mockDb.query.payments.findFirst).not.toHaveBeenCalled();
  expect(enqueueReconciliationJob).not.toHaveBeenCalled();
});

it('captures Stripe payments and enqueues reconciliation on successful intents', async () => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  const payload = JSON.stringify({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_456' } } });
  const signature = createStripeSignature(payload, process.env.STRIPE_WEBHOOK_SECRET);
  const paymentSetSpy = vi.fn(() => ({ where: vi.fn() }));
  const orderSetSpy = vi.fn(() => ({ where: vi.fn() }));

  mockDb.query.payments.findFirst.mockResolvedValue({ id: 'payment-1', orderId: 'order-9' });
  mockDb.transaction.mockImplementation(async (callback) => {
    let callCount = 0;
    await callback({
      update: vi.fn(() => {
        callCount += 1;
        return { set: callCount === 1 ? paymentSetSpy : orderSetSpy };
      }),
    });
  });

  const request: StripeTestRequest = {
    headers: new Headers({ 'stripe-signature': signature }),
    text: async () => payload,
  } as unknown as NextRequest;

  const response = await stripeWebhook(request as NextRequest);

  expect(response.status).toBe(200);
  expect(mockDb.query.payments.findFirst).toHaveBeenCalled();
  expect(paymentSetSpy).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'captured', updatedAt: expect.any(Date), capturedAt: expect.any(Date) }),
  );
  expect(orderSetSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid', updatedAt: expect.any(Date) }));
  expect(enqueueReconciliationJob).toHaveBeenCalledWith('payment-1');
});

it('rejects unauthorized SumUp webhooks', async () => {
  process.env.SUMUP_WEBHOOK_SECRET = 'sumup-secret';
  const request: SumUpTestRequest = {
    headers: new Headers(),
    json: async () => ({}),
  } as unknown as NextRequest;

  const response = await sumupWebhook(request as NextRequest);

  expect(response.status).toBe(401);
  expect(mockDb.query.payments.findFirst).not.toHaveBeenCalled();
});

it('captures SumUp payments and enqueues reconciliation on PAID events', async () => {
  process.env.SUMUP_WEBHOOK_SECRET = 'sumup-secret';
  const paymentSetSpy = vi.fn(() => ({ where: vi.fn() }));
  const orderSetSpy = vi.fn(() => ({ where: vi.fn() }));

  mockDb.query.payments.findFirst.mockResolvedValue({ id: 'payment-42', orderId: 'order-77' });
  mockDb.transaction.mockImplementation(async (callback) => {
    let callCount = 0;
    await callback({
      update: vi.fn(() => {
        callCount += 1;
        return { set: callCount === 1 ? paymentSetSpy : orderSetSpy };
      }),
    });
  });

  const request: SumUpTestRequest = {
    headers: new Headers({ authorization: 'Bearer sumup-secret' }),
    json: async () => ({
      event_type: 'payment_status_changed',
      data: { id: 'payment-42', status: 'PAID' },
    }),
  } as unknown as NextRequest;

  const response = await sumupWebhook(request as NextRequest);

  expect(response.status).toBe(200);
  expect(paymentSetSpy).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'captured', capturedAt: expect.any(Date), updatedAt: expect.any(Date) }),
  );
  expect(orderSetSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid', updatedAt: expect.any(Date) }));
  expect(enqueueReconciliationJob).toHaveBeenCalledWith('payment-42');
});
