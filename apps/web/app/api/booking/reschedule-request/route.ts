import { randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { createRequestLogger } from '@schnittwerk/lib';

import { requestReschedule } from '../_lib/booking';
import { getRequestActor, requireRole } from '../_lib/auth';
import { handleRouteError } from '../_lib/responses';
import { bookingRescheduleRequestSchema } from '../_lib/validation';

const RESCHEDULE_ROLES = ['customer', 'admin', 'manager', 'reception'];

export async function POST(request: NextRequest) {
  const actor = getRequestActor(request);
  requireRole(actor, RESCHEDULE_ROLES);

  const requestId = request.headers.get('x-request-id') ?? randomUUID();
  const logger = createRequestLogger({
    requestId,
    scope: 'booking:reschedule',
    userId: actor.id,
  });

  try {
    const payload = await request.json();
    const parsed = bookingRescheduleRequestSchema.parse(payload);

    await requestReschedule(parsed, actor);
    logger.info('reschedule_recorded', { appointmentId: parsed.appointmentId });

    return NextResponse.json({ status: 'accepted' }, { status: 202 });
  } catch (error) {
    return handleRouteError(error);
  }
}
