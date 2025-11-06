/**
 * Reschedule Request API Endpoint
 * POST /api/booking/reschedule-request
 *
 * Creates a reschedule request for appointments that cannot be cancelled directly
 */

import { NextRequest, NextResponse } from 'next/server';
import { rescheduleRequestSchema } from '@schnittwerk/lib';
import { db, schema } from '@schnittwerk/db';
import { eq } from 'drizzle-orm';
import { createRequestLogger, getRequestId } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  const logger = createRequestLogger(requestId);

  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = rescheduleRequestSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('Invalid reschedule request', { errors: validationResult.error.errors });
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    logger.info('Creating reschedule request', { appointmentId: data.appointmentId });

    // Get appointment
    const appointment = await db.query.appointments.findFirst({
      where: eq(schema.appointments.id, data.appointmentId),
    });

    if (!appointment) {
      logger.warn('Appointment not found', { appointmentId: data.appointmentId });
      return NextResponse.json(
        {
          error: 'Appointment not found',
        },
        { status: 404 }
      );
    }

    // Get staff details
    const staff = await db.query.staff.findFirst({
      where: eq(schema.staff.id, appointment.staffId),
    });

    if (!staff) {
      throw new Error('Staff member not found');
    }

    // Check if appointment can be rescheduled
    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      return NextResponse.json(
        {
          error: 'Appointment cannot be rescheduled in current status',
        },
        { status: 400 }
      );
    }

    // Create notification for staff/admin
    await db.insert(schema.notifications).values({
      userId: staff.userId,
      type: 'reschedule_request',
      title: 'Reschedule Request',
      message: `Customer has requested to reschedule appointment on ${new Date(appointment.startTime).toLocaleDateString('de-CH')} at ${new Date(appointment.startTime).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}.${data.preferredDate ? ` Preferred date: ${data.preferredDate}` : ''}${data.preferredTime ? ` Preferred time: ${data.preferredTime}` : ''}`,
      data: {
        appointmentId: data.appointmentId,
        preferredDate: data.preferredDate,
        preferredTime: data.preferredTime,
        reason: data.reason,
      },
    });

    // Log event
    await db.insert(schema.appointmentEvents).values({
      appointmentId: data.appointmentId,
      eventType: 'rescheduled',
      oldStatus: appointment.status,
      newStatus: appointment.status,
      oldStartTime: appointment.startTime,
      oldEndTime: appointment.endTime,
      notes: `Reschedule requested${data.reason ? `: ${data.reason}` : ''}`,
    });

    logger.info('Reschedule request created', { appointmentId: data.appointmentId });

    // TODO: Send notification email to staff (Phase 2.5)

    return NextResponse.json({
      success: true,
      message: 'Reschedule request submitted. The salon will contact you to confirm the new time.',
      data: {
        appointmentId: data.appointmentId,
        currentStartTime: appointment.startTime,
      },
    });
  } catch (error) {
    logger.error('Failed to create reschedule request', { error });

    return NextResponse.json(
      {
        error: 'Failed to create reschedule request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
