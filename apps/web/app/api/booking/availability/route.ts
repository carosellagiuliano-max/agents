import { randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { createRequestLogger } from '@schnittwerk/lib';

import { getAvailability } from '../_lib/availability';
import { getRequestActor } from '../_lib/auth';
import { handleRouteError } from '../_lib/responses';
import { availabilityQuerySchema } from '../_lib/validation';

export async function GET(request: NextRequest) {
  const actor = getRequestActor(request);
  const requestId = request.headers.get('x-request-id') ?? randomUUID();
  const logger = createRequestLogger({
    requestId,
    scope: 'booking:availability',
    userId: actor.id,
  });

  try {
    const searchParams = request.nextUrl.searchParams;
    const parsed = availabilityQuerySchema.parse({
      serviceId: searchParams.get('serviceId'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
      staffId: searchParams.get('staffId') ?? undefined,
    });

    const availability = await getAvailability(parsed);
    logger.info('availability_computed', {
      serviceId: parsed.serviceId,
      from: parsed.from,
      to: parsed.to,
      staffCount: availability.staff.length,
    });

    return NextResponse.json(availability);
  } catch (error) {
    return handleRouteError(error);
  }
}
