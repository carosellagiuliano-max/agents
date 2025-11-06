import { pgTable, uuid, timestamp, varchar, text, boolean, json } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';

/**
 * Staff members (stylists, receptionists, managers)
 * Extended user profile for employees
 */
export const staff = pgTable('staff', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  bio: text('bio'),
  photoUrl: varchar('photo_url', { length: 500 }),
  // Working rules and preferences
  workingHours: json('working_hours').$type<{
    [day: string]: { start: string; end: string }[];
  }>(),
  isActive: boolean('is_active').default(true).notNull(),
  // Preferences
  bookingEnabled: boolean('booking_enabled').default(true).notNull(),
  bufferTimeBefore: varchar('buffer_time_before', { length: 10 }).default('00:00'),
  bufferTimeAfter: varchar('buffer_time_after', { length: 10 }).default('00:00'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Customers
 * Application-level customer profile
 */
export const customers = pgTable('customers', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .unique()
    .references(() => users.id, { onDelete: 'set null' }),
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  // Preferences and notes
  notes: text('notes'),
  preferences: json('preferences').$type<{
    allergies?: string[];
    skinConditions?: string[];
    communicationPreference?: 'email' | 'sms' | 'both';
  }>(),
  // Marketing consent
  marketingConsent: boolean('marketing_consent').default(false).notNull(),
  marketingConsentDate: timestamp('marketing_consent_date', { withTimezone: true }),
  // Timestamps
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
