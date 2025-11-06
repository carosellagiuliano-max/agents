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
import { customers } from './staff-customers';
import { orders } from './orders-payments';

/**
 * Discount type enum
 */
export const discountTypeEnum = pgEnum('discount_type', ['percentage', 'fixed_amount']);

/**
 * Coupons table
 */
export const coupons = pgTable('coupons', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 50 }).notNull().unique(),
  description: text('description'),
  discountType: discountTypeEnum('discount_type').notNull(),
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  // Limits
  minOrderAmount: decimal('min_order_amount', { precision: 10, scale: 2 }),
  maxDiscountAmount: decimal('max_discount_amount', { precision: 10, scale: 2 }),
  usageLimit: integer('usage_limit'), // null = unlimited
  usageCount: integer('usage_count').default(0).notNull(),
  perCustomerLimit: integer('per_customer_limit'),
  // Validity
  validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Gift cards table
 */
export const giftCards = pgTable('gift_cards', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 50 }).notNull().unique(),
  initialValue: decimal('initial_value', { precision: 10, scale: 2 }).notNull(),
  currentBalance: decimal('current_balance', { precision: 10, scale: 2 }).notNull(),
  // Purchaser and recipient
  purchasedBy: uuid('purchased_by').references(() => customers.id),
  recipientEmail: varchar('recipient_email', { length: 255 }),
  recipientName: varchar('recipient_name', { length: 200 }),
  message: text('message'),
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  isRedeemed: boolean('is_redeemed').default(false).notNull(),
  // Validity
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  purchasedAt: timestamp('purchased_at', { withTimezone: true }).defaultNow().notNull(),
  redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Gift card transactions
 */
export const giftCardTransactions = pgTable('gift_card_transactions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  giftCardId: uuid('gift_card_id')
    .notNull()
    .references(() => giftCards.id, { onDelete: 'cascade' }),
  transactionType: varchar('transaction_type', { length: 50 }).notNull(), // purchase, redemption, refund
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  previousBalance: decimal('previous_balance', { precision: 10, scale: 2 }).notNull(),
  newBalance: decimal('new_balance', { precision: 10, scale: 2 }).notNull(),
  orderId: uuid('order_id').references(() => orders.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
