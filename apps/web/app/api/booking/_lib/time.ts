import { DateTime, Interval } from 'luxon';

export const BUSINESS_TIMEZONE = 'Europe/Zurich';

export function parseISOToDateTime(value: string): DateTime {
  const dt = DateTime.fromISO(value, { zone: BUSINESS_TIMEZONE });
  if (!dt.isValid) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  return dt;
}

export function toPostgresRange(start: DateTime, end: DateTime): string {
  return `[${start.toUTC().toISO()},${end.toUTC().toISO()})`;
}

export function parsePostgresRange(range: string): Interval<true> {
  const trimmed = range.trim();
  const match = trimmed.match(/^[\[(](.*),(.*)[)\]]$/);
  if (!match) {
    throw new Error(`Invalid range format: ${range}`);
  }
  const start = DateTime.fromISO(match[1].trim(), { zone: 'utc' }).setZone(
    BUSINESS_TIMEZONE,
  );
  const end = DateTime.fromISO(match[2].trim(), { zone: 'utc' }).setZone(
    BUSINESS_TIMEZONE,
  );
  if (!start.isValid || !end.isValid) {
    throw new Error(`Invalid range bounds: ${range}`);
  }
  const interval = Interval.fromDateTimes(start, end);
  if (!interval.isValid || !interval.start || !interval.end) {
    throw new Error(`Invalid range values: ${range}`);
  }
  return interval as Interval<true>;
}

export function combineDateAndTime(
  date: DateTime,
  time: string | null,
  fallback?: DateTime | null,
): DateTime | null {
  if (!time) {
    return fallback ?? null;
  }
  const parts = time.split(':').map(Number);
  const [hours = 0, minutes = 0, seconds = 0] = parts;
  const combined = date.set({
    hour: hours,
    minute: minutes,
    second: seconds,
    millisecond: 0,
  });
  return combined.setZone(BUSINESS_TIMEZONE, { keepLocalTime: true });
}

export function alignToStep(date: DateTime, minutesStep: number): DateTime {
  const normalized = date.set({ second: 0, millisecond: 0 });
  const remainder = normalized.minute % minutesStep;
  if (remainder === 0) {
    return normalized;
  }

  return normalized.plus({ minutes: minutesStep - remainder });
}
