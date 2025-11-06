import { pgTable, uuid, timestamp, varchar, text, boolean, json } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';

/**
 * System settings table
 * Key-value store for application configuration
 */
export const settings = pgTable('settings', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }),
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Notifications table
 */
export const notifications = pgTable('notifications', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // appointment_reminder, order_update, etc.
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message').notNull(),
  data: json('data'), // Additional metadata
  isRead: boolean('is_read').default(false).notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Email templates table
 */
export const emailTemplates = pgTable('email_templates', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 100 }).notNull().unique(),
  subject: varchar('subject', { length: 200 }).notNull(),
  bodyHtml: text('body_html').notNull(),
  bodyText: text('body_text').notNull(),
  // Template variables documentation
  variables: text('variables'), // JSON array of available variables
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Audit log table
 * Tracks all sensitive operations for compliance
 */
export const auditLog = pgTable('audit_log', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id'),
  // Changes tracking
  oldValues: text('old_values'), // JSON
  newValues: text('new_values'), // JSON
  // Request metadata
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  requestId: varchar('request_id', { length: 100 }),
  // Additional context
  metadata: text('metadata'), // JSON
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
