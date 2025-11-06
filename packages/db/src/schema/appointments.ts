import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  text,
  decimal,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { staff, customers } from './staff-customers';
import { services } from './services';
import { users } from './auth';

/**
 * Appointment status enum
 */
export const appointmentStatusEnum = pgEnum('appointment_status', [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]);

/**
 * Appointments table
 * Core booking functionality with exclusion constraint for overlap prevention
 */
export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    staffId: uuid('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'restrict' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    // Time slot - stored as timestamp with timezone
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    status: appointmentStatusEnum('status').default('pending').notNull(),
    // Pricing at time of booking
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    // Notes
    customerNotes: text('customer_notes'),
    staffNotes: text('staff_notes'),
    internalNotes: text('internal_notes'),
    // Cancellation
    cancellationReason: text('cancellation_reason'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelledBy: uuid('cancelled_by').references(() => users.id),
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // Index for quick lookups
    staffIdIdx: index('appointments_staff_id_idx').on(table.staffId),
    customerIdIdx: index('appointments_customer_id_idx').on(table.customerId),
    startTimeIdx: index('appointments_start_time_idx').on(table.startTime),
    statusIdx: index('appointments_status_idx').on(table.status),
  })
);

/**
 * Appointment events
 * Audit trail for appointment state changes
 */
export const appointmentEvents = pgTable('appointment_events', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  appointmentId: uuid('appointment_id')
    .notNull()
    .references(() => appointments.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 50 }).notNull(), // created, confirmed, cancelled, rescheduled, completed
  oldStatus: appointmentStatusEnum('old_status'),
  newStatus: appointmentStatusEnum('new_status'),
  // Time change tracking
  oldStartTime: timestamp('old_start_time', { withTimezone: true }),
  oldEndTime: timestamp('old_end_time', { withTimezone: true }),
  newStartTime: timestamp('new_start_time', { withTimezone: true }),
  newEndTime: timestamp('new_end_time', { withTimezone: true }),
  // Metadata
  notes: text('notes'),
  performedBy: uuid('performed_by').references(() => users.id),
  metadata: text('metadata'), // JSON string for additional data
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
