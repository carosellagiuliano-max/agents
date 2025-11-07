import { randomUUID } from 'node:crypto';

import { DateTime } from 'luxon';

import type { Database, SQL } from '@schnittwerk/db';
import { eq, inArray, schema, sql } from '@schnittwerk/db';
import { createRequestLogger } from '@schnittwerk/lib';

import { getDatabase } from '../../../../lib/db';
import type { RequestActor } from './auth';
import { ApiError } from '@/app/api/_lib/errors';
import { sendAppointmentConfirmationEmail } from './email';
import {
  BUSINESS_TIMEZONE,
  parseISOToDateTime,
  parsePostgresRange,
  toPostgresRange,
} from './time';
import type {
  BookingCancelInput,
  BookingCreateInput,
  BookingRescheduleRequestInput,
} from './validation';

type BookingOptions = {
  db?: Database;
};

type AppointmentRecord = {
  id: string;
  status: string;
  staffId: string;
  staffName: string;
  serviceId: string;
  serviceName: string;
  customerId: string;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  start: DateTime;
  end: DateTime;
  notes?: string | null;
  priceCents: number;
  currency: string;
};

const STATUS_BLOCKERS = ['cancelled', 'no_show'];
const ROLE_OVERRIDES = ['admin', 'manager', 'reception'];

function hasOverridePrivileges(actor: RequestActor): boolean {
  return actor.roles.some((role) => ROLE_OVERRIDES.includes(role));
}

async function loadService(db: Database, serviceId: string) {
  const service = await db.query.services.findFirst({
    where: (services, { eq: equals }) => equals(services.id, serviceId),
  });

  if (!service) {
    throw new ApiError('Service not found.', 404);
  }

  if (!service.isOnlineBookable) {
    throw new ApiError('Service cannot be booked online.', 409);
  }

  return service;
}

async function loadStaff(
  db: Database,
  serviceId: string,
  staffId?: string,
) {
  const staffServicesRows = await db
    .select({
      staffId: schema.staffServices.staffId,
      durationMinutes: schema.staffServices.durationMinutes,
      priceCents: schema.staffServices.priceCents,
    })
    .from(schema.staffServices)
    .where(eq(schema.staffServices.serviceId, serviceId));

  const staffIds = staffServicesRows.map((row) => row.staffId);

  if (!staffIds.length) {
    throw new ApiError('No staff configured for this service.', 409);
  }

  const staffRows = await db
    .select({
      id: schema.staff.id,
      displayName: schema.staff.displayName,
      isActive: schema.staff.isActive,
    })
    .from(schema.staff)
    .where(inArray(schema.staff.id, staffIds));

  const candidates = staffRows.filter((row) => row.isActive);

  if (!candidates.length) {
    throw new ApiError('No active staff available for this service.', 409);
  }

  const selected = staffId
    ? candidates.find((row) => row.id === staffId)
    : candidates[0];

  if (!selected) {
    throw new ApiError('Requested staff member cannot perform this service.', 404);
  }

  const override = staffServicesRows.find((row) => row.staffId === selected.id);

  return {
    id: selected.id,
    name: selected.displayName,
    durationOverride: override?.durationMinutes ?? null,
    priceOverride: override?.priceCents ?? null,
  };
}

async function upsertCustomer(
  tx: Database,
  input: BookingCreateInput['customer'],
): Promise<{ id: string; email: string; firstName: string; lastName: string }> {
  const existing = await tx.query.customers.findFirst({
    where: (customers, { eq: equals }) => equals(customers.email, input.email),
  });

  const marketingOptIn = input.marketingOptIn ?? false;

  if (existing) {
    await tx
      .update(schema.customers)
      .set({
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        preferredName: input.firstName,
        marketingOptIn: existing.marketingOptIn || marketingOptIn,
        notes: input.notes ?? existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(schema.customers.id, existing.id));

    return {
      id: existing.id,
      email: existing.email ?? input.email,
      firstName: input.firstName,
      lastName: input.lastName,
    };
  }

  const id = randomUUID();
  await tx.insert(schema.customers).values({
    id,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    preferredName: input.firstName,
    phone: input.phone,
    marketingOptIn,
    notes: input.notes,
  });

  return { id, email: input.email, firstName: input.firstName, lastName: input.lastName };
}

async function findAppointmentByIdempotency(
  db: Database,
  key: string,
): Promise<AppointmentRecord | null> {
  const existing = await db.execute(
    sql`select a.id, a.status, a.staff_id as "staffId", s.display_name as "staffName", a.service_id as "serviceId", sv.name as "serviceName", a.customer_id as "customerId", c.email as "customerEmail", coalesce(c.first_name, '') as "customerFirstName", coalesce(c.last_name, '') as "customerLastName", lower(a.slot) as "start", upper(a.slot) as "end", a.notes, a.price_cents as "priceCents", a.currency
      from appointment_events ae
      join appointments a on a.id = ae.appointment_id
      join staff s on s.id = a.staff_id
      join services sv on sv.id = a.service_id
      join customers c on c.id = a.customer_id
      where ae.event_type = 'created'
        and ae.payload ->> 'idempotencyKey' = ${key}
      order by ae.created_at desc
      limit 1`,
  );

  if (!existing.rows.length) {
    return null;
  }

  const row = existing.rows[0] as unknown as {
    id: string;
    status: string;
    staffId: string;
    staffName: string;
    serviceId: string;
    serviceName: string;
    customerId: string;
    customerEmail: string;
    customerFirstName: string;
    customerLastName: string;
    start: Date;
    end: Date;
    notes?: string | null;
    priceCents: number;
    currency: string;
  };

  return {
    id: row.id,
    status: row.status,
    staffId: row.staffId,
    staffName: row.staffName,
    serviceId: row.serviceId,
    serviceName: row.serviceName,
    customerId: row.customerId,
    customerEmail: row.customerEmail,
    customerFirstName: row.customerFirstName,
    customerLastName: row.customerLastName,
    start: DateTime.fromJSDate(row.start, { zone: BUSINESS_TIMEZONE }),
    end: DateTime.fromJSDate(row.end, { zone: BUSINESS_TIMEZONE }),
    notes: row.notes ?? null,
    priceCents: row.priceCents,
    currency: row.currency,
  };
}

function buildConflictQuery(
  staffId: string,
  start: DateTime,
  end: DateTime,
): SQL<unknown> {
  const blockers = STATUS_BLOCKERS.map((status) => sql`${status}`);
  return sql`staff_id = ${staffId} and status not in (${sql.join(blockers, sql`,`)}) and slot && tstzrange(${start.toUTC().toISO()}, ${end.toUTC().toISO()}, '[)')`;
}

export async function createBooking(
  input: BookingCreateInput,
  actor: RequestActor,
  options: BookingOptions = {},
): Promise<{ appointment: AppointmentRecord; wasDuplicate: boolean }> {
  const db = options.db ?? getDatabase();
  const logger = createRequestLogger({
    requestId: input.idempotencyKey,
    scope: 'booking:create',
    userId: actor.id,
  });

  const existing = await findAppointmentByIdempotency(db, input.idempotencyKey);
  if (existing) {
    logger.info('idempotent_return', { appointmentId: existing.id });
    return { appointment: existing, wasDuplicate: true };
  }

  const service = await loadService(db, input.serviceId);
  const staff = await loadStaff(db, service.id, input.staffId);

  const durationMinutes = staff.durationOverride ?? service.durationMinutes;
  const priceCents = staff.priceOverride ?? service.priceCents;

  const start = parseISOToDateTime(input.start).startOf('minute');
  const end = start.plus({ minutes: durationMinutes });

  if (end <= start) {
    throw new ApiError('Invalid booking window.', 400);
  }

  const appointment = await db.transaction(async (tx) => {
    const customer = await upsertCustomer(tx, input.customer);

    const conflict = await tx.execute(
      sql`select id from appointments where ${buildConflictQuery(
        staff.id,
        start,
        end,
      )} limit 1 for update`,
    );

    if ((conflict.rowCount ?? 0) > 0) {
      throw new ApiError('The selected time slot is no longer available.', 409);
    }

    const appointmentId = randomUUID();

    await tx.insert(schema.appointments).values({
      id: appointmentId,
      customerId: customer.id,
      staffId: staff.id,
      serviceId: service.id,
      status: 'pending',
      slot: toPostgresRange(start, end) as unknown as string,
      priceCents,
      currency: service.currency,
      notes: input.notes ?? input.customer.notes ?? null,
    });

    await tx
      .update(schema.appointments)
      .set({ status: 'confirmed', updatedAt: new Date() })
      .where(eq(schema.appointments.id, appointmentId));

    await tx.insert(schema.appointmentEvents).values([
      {
        appointmentId,
        eventType: 'created',
        payload: {
          source: 'online',
          idempotencyKey: input.idempotencyKey,
          locale: input.locale,
        },
        createdBy: actor.id,
      },
      {
        appointmentId,
        eventType: 'confirmed',
        payload: {
          confirmedBy: actor.id ?? 'customer',
        },
        createdBy: actor.id,
      },
    ]);

    await tx.insert(schema.notifications).values({
      channel: 'email',
      recipient: customer.email,
      subject: 'booking-confirmation',
      payload: {
        appointmentId,
        locale: input.locale,
        template: 'appointment-confirmation',
      },
      status: 'pending',
      createdBy: actor.id,
    });

    if (input.customer.marketingOptIn) {
      await tx.insert(schema.notifications).values({
        channel: 'email',
        recipient: customer.email,
        subject: 'newsletter-double-opt-in',
        payload: {
          type: 'marketing_double_opt_in',
          sourceAppointmentId: appointmentId,
        },
        status: 'pending',
        createdBy: actor.id,
      });
    }

    return {
      id: appointmentId,
      status: 'confirmed',
      staffId: staff.id,
      staffName: staff.name,
      serviceId: service.id,
      serviceName: service.name,
      customerId: customer.id,
      customerEmail: customer.email,
      customerFirstName: customer.firstName,
      customerLastName: customer.lastName,
      start,
      end,
      notes: input.notes ?? null,
      priceCents,
      currency: service.currency,
    } satisfies AppointmentRecord;
  });

  logger.info('appointment_created', { appointmentId: appointment.id, staffId: appointment.staffId });

  await sendAppointmentConfirmationEmail({
    appointmentId: appointment.id,
    serviceName: appointment.serviceName,
    staffName: appointment.staffName,
    start: appointment.start,
    end: appointment.end,
    customerName: `${appointment.customerFirstName} ${appointment.customerLastName}`.trim(),
    customerEmail: appointment.customerEmail,
    locale: input.locale,
    location: process.env.SITE_ADDRESS,
  });

  return { appointment, wasDuplicate: false };
}

export async function cancelBooking(
  input: BookingCancelInput,
  actor: RequestActor,
  options: BookingOptions = {},
): Promise<AppointmentRecord> {
  const db = options.db ?? getDatabase();
  const logger = createRequestLogger({
    requestId: input.appointmentId,
    scope: 'booking:cancel',
    userId: actor.id,
  });

  const settings = await db
    .select({ key: schema.settings.key, value: schema.settings.value })
    .from(schema.settings)
    .where(eq(schema.settings.key, 'booking.cancellation_window_hours'));

  const cancellationSetting = settings[0]?.value;
  const cancellationWindowHours =
    typeof cancellationSetting === 'number'
      ? cancellationSetting
      : typeof cancellationSetting === 'string'
        ? Number(cancellationSetting)
        : 24;

  const appointment = await db.transaction(async (tx) => {
    const [record] = await tx
      .select({
        id: schema.appointments.id,
        status: schema.appointments.status,
        slot: schema.appointments.slot,
        staffId: schema.appointments.staffId,
        serviceId: schema.appointments.serviceId,
        customerId: schema.appointments.customerId,
        notes: schema.appointments.notes,
        priceCents: schema.appointments.priceCents,
        currency: schema.appointments.currency,
      })
      .from(schema.appointments)
      .where(eq(schema.appointments.id, input.appointmentId));

    if (!record) {
      throw new ApiError('Appointment not found.', 404);
    }

    if (record.status === 'cancelled') {
      throw new ApiError('Appointment already cancelled.', 409);
    }

    const interval = parsePostgresRange(String(record.slot));
    const hoursUntilStart = interval.start.diffNow('hours').hours;

    if (hoursUntilStart < cancellationWindowHours && !hasOverridePrivileges(actor)) {
      throw new ApiError('Appointments within the cancellation window require a reschedule request.', 409);
    }

    await tx
      .update(schema.appointments)
      .set({ status: 'cancelled', cancellationReason: input.reason, updatedAt: new Date() })
      .where(eq(schema.appointments.id, input.appointmentId));

    await tx.insert(schema.appointmentEvents).values({
      appointmentId: input.appointmentId,
      eventType: 'cancelled',
      payload: {
        reason: input.reason,
        cancelledBy: actor.id ?? 'customer',
      },
      createdBy: actor.id,
    });

    const [staffRow] = await tx
      .select({ id: schema.staff.id, displayName: schema.staff.displayName })
      .from(schema.staff)
      .where(eq(schema.staff.id, record.staffId));

    const [serviceRow] = await tx
      .select({ id: schema.services.id, name: schema.services.name })
      .from(schema.services)
      .where(eq(schema.services.id, record.serviceId));

    const [customerRow] = await tx
      .select({
        id: schema.customers.id,
        email: schema.customers.email,
        firstName: schema.customers.firstName,
        lastName: schema.customers.lastName,
      })
      .from(schema.customers)
      .where(eq(schema.customers.id, record.customerId));

    await tx.insert(schema.notifications).values({
      channel: 'email',
      recipient: customerRow?.email ?? '',
      subject: 'booking-cancellation',
      payload: {
        appointmentId: input.appointmentId,
        reason: input.reason,
      },
      status: 'pending',
      createdBy: actor.id,
    });

    return {
      id: record.id,
      status: 'cancelled',
      staffId: record.staffId,
      staffName: staffRow?.displayName ?? 'Team',
      serviceId: record.serviceId,
      serviceName: serviceRow?.name ?? 'Service',
      customerId: customerRow?.id ?? record.customerId,
      customerEmail: customerRow?.email ?? '',
      customerFirstName: customerRow?.firstName ?? '',
      customerLastName: customerRow?.lastName ?? '',
      start: interval.start,
      end: interval.end,
      notes: record.notes,
      priceCents: record.priceCents,
      currency: record.currency,
    } satisfies AppointmentRecord;
  });

  logger.info('appointment_cancelled', { appointmentId: appointment.id });
  return appointment;
}

export async function requestReschedule(
  input: BookingRescheduleRequestInput,
  actor: RequestActor,
  options: BookingOptions = {},
): Promise<void> {
  const db = options.db ?? getDatabase();
  const logger = createRequestLogger({
    requestId: input.appointmentId,
    scope: 'booking:reschedule',
    userId: actor.id,
  });

  const appointment = await db.query.appointments.findFirst({
    where: (appointments, { eq: equals }) => equals(appointments.id, input.appointmentId),
  });

  if (!appointment) {
    throw new ApiError('Appointment not found.', 404);
  }

  await db.insert(schema.appointmentEvents).values({
    appointmentId: input.appointmentId,
    eventType: 'rescheduled',
    payload: {
      requestedStart: input.requestedStart,
      notes: input.notes,
      requestedBy: actor.id ?? 'customer',
    },
    createdBy: actor.id,
  });

  await db.insert(schema.notifications).values({
    channel: 'email',
    recipient: process.env.SITE_EMAIL || 'termin@schnittwerk.dev',
    subject: 'booking-reschedule-request',
    payload: {
      appointmentId: input.appointmentId,
      requestedStart: input.requestedStart,
      notes: input.notes,
    },
    status: 'pending',
    createdBy: actor.id,
  });

  logger.info('reschedule_requested', { appointmentId: input.appointmentId });
}
