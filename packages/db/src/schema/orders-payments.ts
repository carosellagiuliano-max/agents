import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { customers } from './staff-customers';
import { productVariants } from './products';
import { appointments } from './appointments';

/**
 * Order status enum
 */
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'payment_pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

/**
 * Orders table
 */
export const orders = pgTable(
  'orders',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    status: orderStatusEnum('status').default('pending').notNull(),
    // Amounts
    subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
    taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).notNull(),
    shippingAmount: decimal('shipping_amount', { precision: 10, scale: 2 }).default('0').notNull(),
    discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0').notNull(),
    total: decimal('total', { precision: 10, scale: 2 }).notNull(),
    // Shipping
    shippingAddress: text('shipping_address'), // JSON object
    // Notes
    customerNotes: text('customer_notes'),
    internalNotes: text('internal_notes'),
    // Timestamps
    paidAt: timestamp('paid_at', { withTimezone: true }),
    shippedAt: timestamp('shipped_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    customerIdIdx: index('orders_customer_id_idx').on(table.customerId),
    statusIdx: index('orders_status_idx').on(table.status),
    createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
  })
);

/**
 * Order items table
 */
export const orderItems = pgTable('order_items', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id')
    .notNull()
    .references(() => productVariants.id, { onDelete: 'restrict' }),
  // Snapshot of product at time of order
  productName: varchar('product_name', { length: 200 }).notNull(),
  variantName: varchar('variant_name', { length: 200 }).notNull(),
  sku: varchar('sku', { length: 100 }).notNull(),
  // Pricing at time of order
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull(), // Percentage
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Payment status enum
 */
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded',
]);

/**
 * Payment method enum
 */
export const paymentMethodEnum = pgEnum('payment_method', [
  'card',
  'cash',
  'bank_transfer',
  'sumup',
  'stripe',
  'terminal',
]);

/**
 * Payments table
 */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'restrict' }),
    // Can also be linked to appointments for deposit payments
    appointmentId: uuid('appointment_id').references(() => appointments.id, {
      onDelete: 'restrict',
    }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    status: paymentStatusEnum('status').default('pending').notNull(),
    method: paymentMethodEnum('method').notNull(),
    // Provider details
    provider: varchar('provider', { length: 50 }), // sumup, stripe
    providerPaymentId: varchar('provider_payment_id', { length: 255 }),
    providerMetadata: text('provider_metadata'), // JSON
    // Idempotency
    idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
    // Timestamps
    processedAt: timestamp('processed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index('payments_order_id_idx').on(table.orderId),
    statusIdx: index('payments_status_idx').on(table.status),
    providerPaymentIdIdx: index('payments_provider_payment_id_idx').on(table.providerPaymentId),
  })
);

/**
 * Refunds table
 */
export const refunds = pgTable('refunds', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'restrict' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  reason: text('reason'),
  status: paymentStatusEnum('status').default('pending').notNull(),
  providerRefundId: varchar('provider_refund_id', { length: 255 }),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
