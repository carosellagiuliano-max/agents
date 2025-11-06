/**
 * Cancel Appointment API Endpoint
 * POST /api/booking/cancel
 *
 * Cancels an appointment (24-hour policy enforced)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cancelAppointmentSchema } from '@schnittwerk/lib';
import { db, schema } from '@schnittwerk/db';
import { eq, and } from 'drizzle-orm';
import { createRequestLogger, getRequestId } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  const logger = createRequestLogger(requestId);

  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = cancelAppointmentSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('Invalid cancel appointment request', { errors: validationResult.error.errors });
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    logger.info('Cancelling appointment', { appointmentId: data.appointmentId });

    // Get cancellation policy from settings (default 24 hours)
    const cancellationHoursSetting = await db.query.settings.findFirst({
      where: eq(schema.settings.key, 'cancellation_hours'),
    });

    const cancellationHours = cancellationHoursSetting
      ? parseInt(cancellationHoursSetting.value)
      : 24;

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // 1. Get appointment
      const appointment = await tx.query.appointments.findFirst({
        where: eq(schema.appointments.id, data.appointmentId),
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // 2. Check if appointment can be cancelled
      if (appointment.status !== 'pending' && appointment.status !== 'confirmed') {
        throw new Error('Appointment cannot be cancelled in current status');
      }

      // 3. Check 24-hour policy
      const now = new Date();
      const appointmentTime = new Date(appointment.startTime);
      const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      const canCancelDirectly = hoursUntilAppointment >= cancellationHours;

      if (!canCancelDirectly) {
        // Create reschedule request instead
        logger.info('Appointment within cancellation window - needs staff approval', {
          hoursUntilAppointment,
          cancellationHours,
        });

        return {
          needsApproval: true,
          appointment,
          hoursUntilAppointment,
          message: `Appointments can only be cancelled ${cancellationHours} hours in advance. Please contact the salon or request a reschedule.`,
        };
      }

      // 4. Update appointment status
      const [updatedAppointment] = await tx
        .update(schema.appointments)
        .set({
          status: 'cancelled',
          cancellationReason: data.reason,
          cancelledAt: now,
          updatedAt: now,
        })
        .where(eq(schema.appointments.id, data.appointmentId))
        .returning();

      // 5. Log cancellation event
      await tx.insert(schema.appointmentEvents).values({
        appointmentId: data.appointmentId,
        eventType: 'cancelled',
        oldStatus: appointment.status,
        newStatus: 'cancelled',
        notes: data.reason || 'Cancelled by customer',
      });

      logger.info('Appointment cancelled successfully', {
        appointmentId: data.appointmentId,
      });

      return {
        needsApproval: false,
        appointment: updatedAppointment,
      };
    });

    // TODO: Send cancellation confirmation email (Phase 2.5)

    if (result.needsApproval) {
      return NextResponse.json({
        success: false,
        needsApproval: true,
        message: result.message,
        data: {
          appointmentId: data.appointmentId,
          hoursUntilAppointment: result.hoursUntilAppointment,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        appointment: result.appointment,
      },
    });
  } catch (error) {
    logger.error('Failed to cancel appointment', { error });

    return NextResponse.json(
      {
        error: 'Failed to cancel appointment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
