import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  time,
  date,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { staff } from './staff-customers';

/**
 * Day of week enum
 */
export const dayOfWeekEnum = pgEnum('day_of_week', [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

/**
 * Opening hours - Regular business hours
 */
export const openingHours = pgTable('opening_hours', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  dayOfWeek: dayOfWeekEnum('day_of_week').notNull(),
  openTime: time('open_time').notNull(),
  closeTime: time('close_time').notNull(),
  isClosed: boolean('is_closed').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Opening exceptions - Special dates (holidays, special hours)
 */
export const openingExceptions = pgTable('opening_exceptions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  date: date('date').notNull().unique(),
  reason: varchar('reason', { length: 200 }),
  isClosed: boolean('is_closed').default(true).notNull(),
  // If not closed, special hours
  openTime: time('open_time'),
  closeTime: time('close_time'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Staff working hours - Individual staff schedules
 */
export const staffWorkingHours = pgTable('staff_working_hours', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  staffId: uuid('staff_id')
    .notNull()
    .references(() => staff.id, { onDelete: 'cascade' }),
  dayOfWeek: dayOfWeekEnum('day_of_week').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  isAvailable: boolean('is_available').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Staff absences - Vacations, sick days, etc.
 */
export const staffAbsences = pgTable('staff_absences', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  staffId: uuid('staff_id')
    .notNull()
    .references(() => staff.id, { onDelete: 'cascade' }),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  reason: varchar('reason', { length: 200 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
