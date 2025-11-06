import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { staff } from './staff-customers';

/**
 * Services offered by the salon
 */
export const services = pgTable('services', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  duration: integer('duration').notNull(), // in minutes
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  // Categorization
  category: varchar('category', { length: 100 }),
  // Display
  displayOrder: integer('display_order').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Staff-Service assignments
 * Which staff members can perform which services
 */
export const staffServices = pgTable('staff_services', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  staffId: uuid('staff_id')
    .notNull()
    .references(() => staff.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id')
    .notNull()
    .references(() => services.id, { onDelete: 'cascade' }),
  // Staff-specific pricing override (optional)
  customPrice: decimal('custom_price', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
