import { randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { createRequestLogger } from '@schnittwerk/lib';

import { createBooking } from '../_lib/booking';
import { getRequestActor, requireRole } from '../_lib/auth';
import { handleRouteError } from '../_lib/responses';
import { bookingCreateSchema } from '../_lib/validation';

export async function POST(request: NextRequest) {
  const actor = getRequestActor(request);
  requireRole(actor, ['anonymous', 'customer']);

  const requestId = request.headers.get('x-request-id') ?? randomUUID();
  const logger = createRequestLogger({
    requestId,
    scope: 'booking:create',
    userId: actor.id,
  });

  try {
    const payload = await request.json();
    const parsed = bookingCreateSchema.parse(payload);

    const result = await createBooking(parsed, actor);
    logger.info('booking_created', {
      appointmentId: result.appointment.id,
      staffId: result.appointment.staffId,
      serviceId: result.appointment.serviceId,
      duplicate: result.wasDuplicate,
    });

    return NextResponse.json(
      {
        appointmentId: result.appointment.id,
        status: result.appointment.status,
        staffId: result.appointment.staffId,
        staffName: result.appointment.staffName,
        serviceId: result.appointment.serviceId,
        serviceName: result.appointment.serviceName,
        start: result.appointment.start.toISO(),
        end: result.appointment.end.toISO(),
        priceCents: result.appointment.priceCents,
        currency: result.appointment.currency,
        wasDuplicate: result.wasDuplicate,
      },
      { status: result.wasDuplicate ? 200 : 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
