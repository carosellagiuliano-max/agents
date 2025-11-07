import { randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { createRequestLogger } from '@schnittwerk/lib';

import { enforceBookingGuards } from '@/app/api/_lib/security';

import { cancelBooking } from '../_lib/booking';
import { getRequestActor, requireRole } from '../_lib/auth';
import { handleRouteError } from '../_lib/responses';
import { bookingCancelSchema } from '../_lib/validation';

const CANCELLATION_ROLES = ['customer', 'admin', 'manager', 'reception'];

export async function POST(request: NextRequest) {
  const actor = getRequestActor(request);
  requireRole(actor, CANCELLATION_ROLES);
  await enforceBookingGuards(request, actor);

  const requestId = request.headers.get('x-request-id') ?? randomUUID();
  const logger = createRequestLogger({
    requestId,
    scope: 'booking:cancel',
    userId: actor.id,
  });

  try {
    const payload = await request.json();
    const parsed = bookingCancelSchema.parse(payload);

    const appointment = await cancelBooking(parsed, actor);
    logger.info('booking_cancelled', {
      appointmentId: appointment.id,
      staffId: appointment.staffId,
      serviceId: appointment.serviceId,
    });

    return NextResponse.json({
      appointmentId: appointment.id,
      status: appointment.status,
      staffId: appointment.staffId,
      staffName: appointment.staffName,
      serviceId: appointment.serviceId,
      serviceName: appointment.serviceName,
      start: appointment.start.toISO(),
      end: appointment.end.toISO(),
      priceCents: appointment.priceCents,
      currency: appointment.currency,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
