/**
 * Availability API Endpoint
 * GET /api/booking/availability
 *
 * Checks available time slots for a given staff member, service, and date
 */

import { NextRequest, NextResponse } from 'next/server';
import { availabilitySchema } from '@schnittwerk/lib';
import { calculateAvailability } from '@/lib/services/booking';
import { createRequestLogger, getRequestId } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  const logger = createRequestLogger(requestId);

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const serviceId = searchParams.get('serviceId');
    const date = searchParams.get('date');

    // Validate input
    const validationResult = availabilitySchema.safeParse({
      staffId,
      serviceId,
      date,
    });

    if (!validationResult.success) {
      logger.warn('Invalid availability request', { errors: validationResult.error.errors });
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const params = validationResult.data;

    logger.info('Checking availability', { params });

    // Calculate availability
    const slots = await calculateAvailability(params);

    logger.info('Availability calculated', { slotCount: slots.length });

    return NextResponse.json({
      success: true,
      data: {
        date: params.date,
        staffId: params.staffId,
        serviceId: params.serviceId,
        slots: slots.map((slot) => ({
          startTime: slot.startTime.toISOString(),
          endTime: slot.endTime.toISOString(),
          available: slot.available,
        })),
      },
    });
  } catch (error) {
    logger.error('Failed to calculate availability', { error });

    return NextResponse.json(
      {
        error: 'Failed to calculate availability',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
