/**
 * Booking Service
 * Core business logic for appointment booking
 */

import { db, schema } from '@schnittwerk/db';
import { and, eq, gte, lte, or } from 'drizzle-orm';

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
}

export interface AvailabilityParams {
  staffId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD format
}

/**
 * Calculate available time slots for a given staff member, service, and date
 */
export async function calculateAvailability(params: AvailabilityParams): Promise<TimeSlot[]> {
  const { staffId, serviceId, date } = params;

  // 1. Get service duration
  const service = await db.query.services.findFirst({
    where: eq(schema.services.id, serviceId),
  });

  if (!service) {
    throw new Error('Service not found');
  }

  const serviceDuration = service.duration; // in minutes

  // 2. Get staff member and working hours
  const staff = await db.query.staff.findFirst({
    where: eq(schema.staff.id, staffId),
  });

  if (!staff || !staff.isActive) {
    throw new Error('Staff member not found or inactive');
  }

  // 3. Check if date is in the past
  const requestDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (requestDate < today) {
    return []; // No slots for past dates
  }

  // 4. Get day of week
  const dayOfWeek = getDayOfWeek(requestDate);

  // 5. Check for opening exceptions (holidays, special hours)
  const exception = await db.query.openingExceptions.findFirst({
    where: eq(schema.openingExceptions.date, date),
  });

  if (exception?.isClosed) {
    return []; // Salon is closed on this date
  }

  // 6. Get regular opening hours or exception hours
  let openTime: string;
  let closeTime: string;

  if (exception && !exception.isClosed) {
    openTime = exception.openTime!;
    closeTime = exception.closeTime!;
  } else {
    const regularHours = await db.query.openingHours.findFirst({
      where: and(
        eq(schema.openingHours.dayOfWeek, dayOfWeek as any),
        eq(schema.openingHours.isClosed, false)
      ),
    });

    if (!regularHours || regularHours.isClosed) {
      return []; // Salon is closed on this day of week
    }

    openTime = regularHours.openTime;
    closeTime = regularHours.closeTime;
  }

  // 7. Check staff working hours for this day
  const staffWorkingHours = await db.query.staffWorkingHours.findFirst({
    where: and(
      eq(schema.staffWorkingHours.staffId, staffId),
      eq(schema.staffWorkingHours.dayOfWeek, dayOfWeek as any),
      eq(schema.staffWorkingHours.isAvailable, true)
    ),
  });

  if (!staffWorkingHours) {
    return []; // Staff doesn't work on this day
  }

  // Use staff working hours if more restrictive than salon hours
  const staffStart = staffWorkingHours.startTime;
  const staffEnd = staffWorkingHours.endTime;

  // 8. Check for staff absences
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const absence = await db.query.staffAbsences.findFirst({
    where: and(
      eq(schema.staffAbsences.staffId, staffId),
      lte(schema.staffAbsences.startDate, endOfDay),
      gte(schema.staffAbsences.endDate, startOfDay)
    ),
  });

  if (absence) {
    return []; // Staff is absent on this date
  }

  // 9. Get existing appointments for this staff on this date
  const existingAppointments = await db
    .select()
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.staffId, staffId),
        gte(schema.appointments.startTime, startOfDay),
        lte(schema.appointments.startTime, endOfDay),
        or(
          eq(schema.appointments.status, 'pending'),
          eq(schema.appointments.status, 'confirmed'),
          eq(schema.appointments.status, 'in_progress')
        )
      )
    )
    .orderBy(schema.appointments.startTime);

  // 10. Generate time slots
  const slots = generateTimeSlots(
    date,
    staffStart,
    staffEnd,
    serviceDuration,
    existingAppointments,
    staff.bufferTimeBefore || '00:00',
    staff.bufferTimeAfter || '00:00'
  );

  return slots;
}

/**
 * Generate time slots for a given day
 */
function generateTimeSlots(
  date: string,
  startTime: string,
  endTime: string,
  serviceDuration: number,
  existingAppointments: any[],
  bufferBefore: string,
  bufferAfter: string
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Parse time strings
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const [bufferBeforeMinutes] = bufferBefore.split(':').map(Number);
  const [bufferAfterMinutes] = bufferAfter.split(':').map(Number);

  // Create date objects
  const current = new Date(date);
  current.setHours(startHour, startMinute, 0, 0);

  const end = new Date(date);
  end.setHours(endHour, endMinute, 0, 0);

  // Generate slots in 15-minute increments
  const slotInterval = 15; // minutes
  const totalServiceTime = serviceDuration + bufferBeforeMinutes + bufferAfterMinutes;

  while (current.getTime() + totalServiceTime * 60 * 1000 <= end.getTime()) {
    const slotStart = new Date(current);
    const slotEnd = new Date(current.getTime() + serviceDuration * 60 * 1000);

    // Check if slot overlaps with existing appointments (including buffer times)
    const slotStartWithBuffer = new Date(slotStart.getTime() - bufferBeforeMinutes * 60 * 1000);
    const slotEndWithBuffer = new Date(slotEnd.getTime() + bufferAfterMinutes * 60 * 1000);

    const isAvailable = !existingAppointments.some((appointment) => {
      const appStart = new Date(appointment.startTime);
      const appEnd = new Date(appointment.endTime);

      // Check for any overlap
      return (
        (slotStartWithBuffer >= appStart && slotStartWithBuffer < appEnd) ||
        (slotEndWithBuffer > appStart && slotEndWithBuffer <= appEnd) ||
        (slotStartWithBuffer <= appStart && slotEndWithBuffer >= appEnd)
      );
    });

    // Only include slots that are in the future (at least 1 hour from now)
    const now = new Date();
    const minimumBookingTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour ahead

    if (slotStart >= minimumBookingTime) {
      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        available: isAvailable,
      });
    }

    // Move to next slot
    current.setMinutes(current.getMinutes() + slotInterval);
  }

  return slots;
}

/**
 * Get day of week from date
 */
function getDayOfWeek(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}
