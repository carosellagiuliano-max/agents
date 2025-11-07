import { DateTime, Interval } from 'luxon';

import type { Database, SQL } from '@schnittwerk/db';
import { and, eq, inArray, notInArray, schema, sql } from '@schnittwerk/db';

import { getDatabase } from '../../../../lib/db';
import { ApiError } from './errors';
import type { AvailabilityQueryInput } from './validation';
import {
  alignToStep,
  BUSINESS_TIMEZONE,
  combineDateAndTime,
  parseISOToDateTime,
  parsePostgresRange,
} from './time';

const INACTIVE_APPOINTMENT_STATUSES = ['cancelled', 'no_show'] as const;

export type AvailabilitySlot = {
  staffId: string;
  staffName: string;
  staffColor?: string | null;
  start: string;
  end: string;
  durationMinutes: number;
};

export type StaffAvailability = {
  staffId: string;
  staffName: string;
  colorHex?: string | null;
  slots: AvailabilitySlot[];
};

export type AvailabilityResult = {
  serviceId: string;
  from: string;
  to: string;
  staff: StaffAvailability[];
};

type BufferSetting = {
  before?: number;
  after?: number;
};

type AvailabilityOptions = {
  db?: Database;
};

const DEFAULT_BUFFER: Required<BufferSetting> = { before: 10, after: 5 };
const DEFAULT_STEP_MINUTES = 5;
const MAX_RANGE_DAYS = 31;

function buildWhereClause(filters: Array<SQL<unknown> | undefined>): SQL<unknown> {
  let clause: SQL<unknown> | undefined;
  for (const filter of filters) {
    if (!filter) {
      continue;
    }
    clause = clause ? and(clause, filter) : filter;
  }
  return clause ?? sql`true`;
}

function requireIsoString(value: DateTime, context: string): string {
  const iso = value.toISO();
  if (!iso) {
    throw new Error(context);
  }
  return iso;
}

function requireIsoDate(value: DateTime, context: string): string {
  const iso = value.toISODate();
  if (!iso) {
    throw new Error(context);
  }
  return iso;
}

export async function getAvailability(
  input: AvailabilityQueryInput,
  options: AvailabilityOptions = {},
): Promise<AvailabilityResult> {
  const db = options.db ?? getDatabase();

  const from = parseISOToDateTime(input.from).startOf('minute');
  const to = parseISOToDateTime(input.to).startOf('minute');

  if (to <= from) {
    throw new ApiError('The end of the range must be after the start.', 400);
  }

  if (to.diff(from, 'days').days > MAX_RANGE_DAYS) {
    throw new ApiError('Requested range is too large. Please limit to 31 days.', 400);
  }

  const service = await db.query.services.findFirst({
    where: (services, { eq: equals }) => equals(services.id, input.serviceId),
  });

  if (!service) {
    throw new ApiError('Service not found.', 404);
  }

  if (!service.isOnlineBookable) {
    throw new ApiError('Service cannot be booked online.', 409);
  }

  const staffServicesRows = await db
    .select({
      staffId: schema.staffServices.staffId,
      durationMinutes: schema.staffServices.durationMinutes,
      priceCents: schema.staffServices.priceCents,
    })
    .from(schema.staffServices)
    .where(eq(schema.staffServices.serviceId, service.id));

  const filteredStaffServiceRows = staffServicesRows.filter((row) =>
    input.staffId ? row.staffId === input.staffId : true,
  );

  if (filteredStaffServiceRows.length === 0) {
    throw new ApiError('No active staff offers this service.', 404);
  }

  const staffIds = Array.from(new Set(filteredStaffServiceRows.map((row) => row.staffId)));

  const staffRows = staffIds.length
    ? await db
        .select({
          id: schema.staff.id,
          displayName: schema.staff.displayName,
          isActive: schema.staff.isActive,
          colorHex: schema.staff.colorHex,
        })
        .from(schema.staff)
        .where(inArray(schema.staff.id, staffIds))
    : [];

  const staffMap = new Map(
    staffRows.filter((row) => row.isActive).map((row) => [row.id, row]),
  );

  const activeStaffServiceRows = filteredStaffServiceRows.filter((row) =>
    staffMap.has(row.staffId),
  );

  if (activeStaffServiceRows.length === 0) {
    throw new ApiError('All staff for this service are inactive.', 409);
  }

  const openingHoursRows = await db
    .select({
      dayOfWeek: schema.openingHours.dayOfWeek,
      opensAt: schema.openingHours.opensAt,
      closesAt: schema.openingHours.closesAt,
      isClosed: schema.openingHours.isClosed,
    })
    .from(schema.openingHours);

  const openingExceptionsRows = await db
    .select({
      date: schema.openingExceptions.date,
      opensAt: schema.openingExceptions.opensAt,
      closesAt: schema.openingExceptions.closesAt,
      isClosed: schema.openingExceptions.isClosed,
    })
    .from(schema.openingExceptions);

  const settingsRows = await db
    .select({ key: schema.settings.key, value: schema.settings.value })
    .from(schema.settings)
    .where(
      inArray(schema.settings.key, [
        'booking.buffer_minutes',
        'booking.slot_step_minutes',
      ]),
    );

  const settingsMap = new Map(settingsRows.map((row) => [row.key, row.value]));
  const bufferSetting = settingsMap.get('booking.buffer_minutes') as BufferSetting | undefined;
  const bufferBefore = Number(bufferSetting?.before ?? DEFAULT_BUFFER.before);
  const bufferAfter = Number(bufferSetting?.after ?? DEFAULT_BUFFER.after);
  const slotStepMinutes = Number(
    (settingsMap.get('booking.slot_step_minutes') as number | undefined) ?? DEFAULT_STEP_MINUTES,
  );

  const fromUtc = requireIsoString(from.toUTC(), 'Failed to serialise availability start window');
  const toUtc = requireIsoString(to.toUTC(), 'Failed to serialise availability end window');

  let appointmentsRows: { id: string; staffId: string; slot: string }[] = [];

  if (staffIds.length) {
    const filters: SQL<unknown>[] = [
      inArray(schema.appointments.staffId, staffIds),
      sql`${schema.appointments.slot} && tstzrange(${fromUtc}, ${toUtc}, '[)')`,
      notInArray(schema.appointments.status, Array.from(INACTIVE_APPOINTMENT_STATUSES)),
    ];
    const whereClause = buildWhereClause(filters);
    appointmentsRows = await db
      .select({
        id: schema.appointments.id,
        staffId: schema.appointments.staffId,
        slot: schema.appointments.slot,
      })
      .from(schema.appointments)
      .where(whereClause);
  }

  const busyByStaff = new Map<string, Interval[]>();
  for (const row of appointmentsRows) {
    const interval = parsePostgresRange(String(row.slot));
    const expandedStart = interval.start.minus({ minutes: bufferBefore });
    const expandedEnd = interval.end.plus({ minutes: bufferAfter });
    const expandedInterval = Interval.fromDateTimes(expandedStart, expandedEnd);
    if (!expandedInterval.isValid || !expandedInterval.start || !expandedInterval.end) {
      continue;
    }
    const list = busyByStaff.get(row.staffId) ?? [];
    list.push(expandedInterval as Interval<true>);
    busyByStaff.set(row.staffId, list);
  }

  const openingHoursByDay = new Map<number, (typeof openingHoursRows)[number]>();
  for (const row of openingHoursRows) {
    openingHoursByDay.set(row.dayOfWeek, row);
  }

  const openingExceptionsByDate = new Map<string, (typeof openingExceptionsRows)[number]>();
  for (const row of openingExceptionsRows) {
    const rawDateInput =
      typeof row.date === 'string' ? new Date(row.date) : row.date ?? null;
    if (!rawDateInput || Number.isNaN(rawDateInput.getTime())) {
      continue;
    }
    const isoDate = requireIsoDate(
      DateTime.fromJSDate(rawDateInput, { zone: BUSINESS_TIMEZONE }),
      'Failed to serialise opening exception date',
    );
    openingExceptionsByDate.set(isoDate, row);
  }

  const staffAvailability: StaffAvailability[] = activeStaffServiceRows.map((row) => {
    const staff = staffMap.get(row.staffId)!;
    return {
      staffId: staff.id,
      staffName: staff.displayName,
      colorHex: staff.colorHex,
      slots: [],
    };
  });

  const now = DateTime.now().setZone(BUSINESS_TIMEZONE);
  const dayCursorEnd = to.plus({ days: 1 }).startOf('day');

  for (
    let dayCursor = from.startOf('day');
    dayCursor < dayCursorEnd;
    dayCursor = dayCursor.plus({ days: 1 })
  ) {
    const dayKey = requireIsoDate(dayCursor, 'Failed to serialise day cursor for availability lookup');
    const exception = openingExceptionsByDate.get(dayKey);
    const dayOfWeek = dayCursor.weekday; // 1 (Monday) - 7 (Sunday)
    const defaultHours = openingHoursByDay.get(dayOfWeek);

    let openStart: DateTime | null = null;
    let openEnd: DateTime | null = null;

    if (exception) {
      if (exception.isClosed) {
        continue;
      }
      openStart = combineDateAndTime(dayCursor, exception.opensAt, null);
      openEnd = combineDateAndTime(dayCursor, exception.closesAt, null);
    } else if (defaultHours && !defaultHours.isClosed) {
      openStart = combineDateAndTime(dayCursor, defaultHours.opensAt, null);
      openEnd = combineDateAndTime(dayCursor, defaultHours.closesAt, null);
    }

    if (!openStart || !openEnd || openEnd <= openStart) {
      continue;
    }

    const windowStart = DateTime.max(openStart, from);
    const windowEnd = DateTime.min(openEnd, to);

    if (windowEnd <= windowStart) {
      continue;
    }

    const dayStartAligned = alignToStep(windowStart, slotStepMinutes);

    for (const availability of staffAvailability) {
      const staffConfig = activeStaffServiceRows.find(
        (row) => row.staffId === availability.staffId,
      );
      if (!staffConfig) {
        continue;
      }

      const duration = staffConfig.durationMinutes ?? service.durationMinutes;
      const busy = (busyByStaff.get(availability.staffId) ?? []).filter((interval) =>
        interval.overlaps(Interval.fromDateTimes(windowStart, windowEnd)),
      );

      for (
        let start = dayStartAligned;
        start.plus({ minutes: duration }) <= windowEnd;
        start = start.plus({ minutes: slotStepMinutes })
      ) {
        if (start < now) {
          continue;
        }

        const end = start.plus({ minutes: duration });
        const candidateInterval = Interval.fromDateTimes(
          start.minus({ minutes: bufferBefore }),
          end.plus({ minutes: bufferAfter }),
        );

        if (!candidateInterval.isValid || !candidateInterval.start || !candidateInterval.end) {
          continue;
        }

        if (candidateInterval.start < openStart || candidateInterval.end > openEnd) {
          continue;
        }

        const overlaps = busy.some((interval) => interval.overlaps(candidateInterval));

        if (!overlaps) {
          const startIso = requireIsoString(start, 'Failed to serialise availability slot start');
          const endIso = requireIsoString(end, 'Failed to serialise availability slot end');

          availability.slots.push({
            staffId: availability.staffId,
            staffName: availability.staffName,
            staffColor: availability.colorHex,
            start: startIso,
            end: endIso,
            durationMinutes: duration,
          });
        }
      }
    }
  }

  const filteredStaffAvailability = staffAvailability
    .map((entry) => ({
      ...entry,
      slots: entry.slots
        .filter((slot) => parseISOToDateTime(slot.start) >= from && parseISOToDateTime(slot.end) <= to)
        .sort((a, b) => a.start.localeCompare(b.start)),
    }))
    .filter((entry) => entry.slots.length > 0);

  return {
    serviceId: service.id,
    from: requireIsoString(from, 'Failed to serialise availability response start'),
    to: requireIsoString(to, 'Failed to serialise availability response end'),
    staff: filteredStaffAvailability,
  };
}
