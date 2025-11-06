/**
 * Create Appointment API Endpoint
 * POST /api/booking/create
 *
 * Creates a new appointment with transactional safety
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAppointmentSchema } from '@schnittwerk/lib';
import { db, schema } from '@schnittwerk/db';
import { and, eq, gte, lte, or, sql } from 'drizzle-orm';
import { createRequestLogger, getRequestId } from '@/lib/logger';
import { sendAppointmentConfirmation } from '@/lib/services/email';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  const logger = createRequestLogger(requestId);

  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = createAppointmentSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('Invalid create appointment request', { errors: validationResult.error.errors });
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    logger.info('Creating appointment', {
      customerId: data.customerId,
      staffId: data.staffId,
      serviceId: data.serviceId,
      startTime: data.startTime,
    });

    // Check for idempotency
    if (data.idempotencyKey) {
      const existing = await db.query.appointments.findFirst({
        where: and(
          eq(schema.appointments.customerId, data.customerId),
          sql`metadata->>'idempotency_key' = ${data.idempotencyKey}`
        ),
      });

      if (existing) {
        logger.info('Idempotent request - returning existing appointment', {
          appointmentId: existing.id,
        });
        return NextResponse.json({
          success: true,
          data: {
            appointment: existing,
            idempotent: true,
          },
        });
      }
    }

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // 1. Get service details
      const service = await tx.query.services.findFirst({
        where: eq(schema.services.id, data.serviceId),
      });

      if (!service || !service.isActive) {
        throw new Error('Service not found or inactive');
      }

      // 2. Validate customer exists
      const customer = await tx.query.customers.findFirst({
        where: eq(schema.customers.id, data.customerId),
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // 3. Validate staff exists and is active
      const staff = await tx.query.staff.findFirst({
        where: eq(schema.staff.id, data.staffId),
      });

      if (!staff || !staff.isActive || !staff.bookingEnabled) {
        throw new Error('Staff member not available for booking');
      }

      // 4. Calculate end time
      const startTime = new Date(data.startTime);
      const endTime = new Date(startTime.getTime() + service.duration * 60 * 1000);

      // 5. Check for overlapping appointments using SELECT FOR UPDATE
      // This locks the rows to prevent race conditions
      const overlapping = await tx
        .select()
        .from(schema.appointments)
        .where(
          and(
            eq(schema.appointments.staffId, data.staffId),
            or(
              eq(schema.appointments.status, 'pending'),
              eq(schema.appointments.status, 'confirmed'),
              eq(schema.appointments.status, 'in_progress')
            ),
            or(
              // New appointment starts during existing appointment
              and(
                lte(schema.appointments.startTime, startTime),
                gte(schema.appointments.endTime, startTime)
              ),
              // New appointment ends during existing appointment
              and(
                lte(schema.appointments.startTime, endTime),
                gte(schema.appointments.endTime, endTime)
              ),
              // New appointment completely contains existing appointment
              and(
                gte(schema.appointments.startTime, startTime),
                lte(schema.appointments.endTime, endTime)
              )
            )
          )
        )
        .for('update');

      if (overlapping.length > 0) {
        throw new Error('Time slot is no longer available');
      }

      // 6. Create appointment
      const [appointment] = await tx
        .insert(schema.appointments)
        .values({
          customerId: data.customerId,
          staffId: data.staffId,
          serviceId: data.serviceId,
          startTime,
          endTime,
          price: service.price,
          status: 'pending',
          customerNotes: data.customerNotes,
        })
        .returning();

      // 7. Log appointment creation event
      await tx.insert(schema.appointmentEvents).values({
        appointmentId: appointment.id,
        eventType: 'created',
        newStatus: 'pending',
        newStartTime: startTime,
        newEndTime: endTime,
        notes: 'Appointment created via online booking',
      });

      logger.info('Appointment created successfully', { appointmentId: appointment.id });

      return { appointment, service, customer, staff };
    });

    // Send confirmation email with ICS attachment
    if (process.env.RESEND_API_KEY) {
      sendAppointmentConfirmation(result.appointment.id)
        .then((emailResult) => {
          if (emailResult.success) {
            logger.info('Confirmation email sent', { appointmentId: result.appointment.id });
          } else {
            logger.error('Failed to send confirmation email', {
              appointmentId: result.appointment.id,
              error: emailResult.error,
            });
          }
        })
        .catch((error) => {
          logger.error('Email sending error', { error });
        });
    } else {
      logger.warn('RESEND_API_KEY not configured - skipping email');
    }

    return NextResponse.json({
      success: true,
      data: {
        appointment: result.appointment,
        service: {
          id: result.service.id,
          name: result.service.name,
          duration: result.service.duration,
        },
        staff: {
          id: result.staff.id,
          displayName: result.staff.displayName,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to create appointment', { error });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to create appointment',
        message: errorMessage,
      },
      { status: errorMessage.includes('not available') ? 409 : 500 }
    );
  }
}
