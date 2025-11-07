import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';

import {
  alignToStep,
  BUSINESS_TIMEZONE,
  combineDateAndTime,
  parsePostgresRange,
  parseISOToDateTime,
  toPostgresRange,
} from '../../app/api/booking/_lib/time';

describe('time helpers', () => {
  it('parses postgres ranges into intervals', () => {
    const range = '[2024-05-01T07:00:00.000Z,2024-05-01T08:30:00.000Z)';
    const interval = parsePostgresRange(range);

    expect(interval.start).not.toBeNull();
    expect(interval.end).not.toBeNull();
    expect(interval.start?.toISO()).toBe(DateTime.fromISO('2024-05-01T09:00:00', { zone: BUSINESS_TIMEZONE }).toISO());
    expect(interval.end?.toISO()).toBe(DateTime.fromISO('2024-05-01T10:30:00', { zone: BUSINESS_TIMEZONE }).toISO());
  });

  it('combines dates and times correctly', () => {
    const date = DateTime.fromISO('2024-06-01', { zone: BUSINESS_TIMEZONE });
    const combined = combineDateAndTime(date, '09:15');
    expect(combined?.toISO()).toBe(DateTime.fromISO('2024-06-01T09:15:00', { zone: BUSINESS_TIMEZONE }).toISO());
  });

  it('aligns timestamps to the next step', () => {
    const original = DateTime.fromISO('2024-06-01T09:07:00', { zone: BUSINESS_TIMEZONE });
    const aligned = alignToStep(original, 5);
    expect(aligned.minute).toBe(10);
  });

  it('serialises postgres ranges', () => {
    const start = parseISOToDateTime('2024-05-01T09:00:00+02:00');
    const end = start.plus({ minutes: 45 });
    const range = toPostgresRange(start, end);
    expect(range).toMatch(/\[2024-05-01T07:00:00\.000Z,2024-05-01T07:45:00\.000Z\)/);
  });
});
