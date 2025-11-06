import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';

/**
 * Tax rate enum for Swiss VAT
 */
export const taxRateEnum = pgEnum('tax_rate', ['standard', 'reduced', 'special']);

/**
 * Products table
 */
export const products = pgTable('products', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  brand: varchar('brand', { length: 100 }),
  category: varchar('category', { length: 100 }),
  // Pricing
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
  taxRate: taxRateEnum('tax_rate').default('standard').notNull(),
  // Display
  imageUrl: varchar('image_url', { length: 500 }),
  images: text('images'), // JSON array of image URLs
  isActive: boolean('is_active').default(true).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  displayOrder: integer('display_order').default(0),
  // SEO
  slug: varchar('slug', { length: 200 }).unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Product variants (sizes, colors, etc.)
 */
export const productVariants = pgTable('product_variants', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  // Variant attributes (e.g., "250ml", "Red", etc.)
  attributes: text('attributes'), // JSON object
  // Pricing override
  price: decimal('price', { precision: 10, scale: 2 }),
  // Inventory
  stockQuantity: integer('stock_quantity').default(0).notNull(),
  lowStockThreshold: integer('low_stock_threshold').default(5),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Stock movements - Inventory audit trail
 */
export const stockMovements = pgTable('stock_movements', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  variantId: uuid('variant_id')
    .notNull()
    .references(() => productVariants.id, { onDelete: 'restrict' }),
  movementType: varchar('movement_type', { length: 50 }).notNull(), // purchase, sale, adjustment, damage, return
  quantity: integer('quantity').notNull(), // Positive for increase, negative for decrease
  previousQuantity: integer('previous_quantity').notNull(),
  newQuantity: integer('new_quantity').notNull(),
  // Reference to related transaction (order, purchase order, etc.)
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: uuid('reference_id'),
  notes: text('notes'),
  performedBy: uuid('performed_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
