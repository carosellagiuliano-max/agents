import {
  bigserial,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  index,
  char,
  customType,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  appointmentEventEnum,
  appointmentStatusEnum,
  couponDiscountTypeEnum,
  notificationChannelEnum,
  notificationStatusEnum,
  orderStatusEnum,
  paymentStatusEnum,
  refundReasonEnum,
  stockMovementTypeEnum,
  userStatusEnum,
} from "./enums";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  phone: text("phone"),
  fullName: text("full_name"),
  preferredName: text("preferred_name"),
  locale: text("locale").notNull().default("de-CH"),
  status: userStatusEnum("status").notNull().default("invited"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roleAssignments = pgTable(
  "role_assignments",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleCode: text("role_code")
      .notNull()
      .references(() => roles.code, { onDelete: "restrict" }),
    assignedBy: uuid("assigned_by").references(() => users.id, { onDelete: "set null" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleCode], name: "role_assignments_pkey" }),
    byUserIdx: index("role_assignments_user_idx").on(table.userId),
    byRoleIdx: index("role_assignments_role_idx").on(table.roleCode),
  }),
);

export const staff = pgTable("staff", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  colorHex: varchar("color_hex", { length: 7 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    priceCents: integer("price_cents").notNull().default(0),
    currency: char("currency", { length: 3 }).notNull().default("CHF"),
    category: text("category"),
    taxRate: numeric("tax_rate", { precision: 4, scale: 2 }).default("7.70"),
    isActive: boolean("is_active").notNull().default(true),
    isOnlineBookable: boolean("is_online_bookable").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIndex: uniqueIndex("services_slug_key").on(table.slug),
    nameIdx: index("services_name_idx").on(table.name),
  }),
);

export const staffServices = pgTable(
  "staff_services",
  {
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    durationMinutes: integer("duration_minutes"),
    priceCents: integer("price_cents"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.staffId, table.serviceId], name: "staff_services_pkey" }),
    staffIdx: index("staff_services_staff_idx").on(table.staffId),
    serviceIdx: index("staff_services_service_idx").on(table.serviceId),
  }),
);

export const openingHours = pgTable(
  "opening_hours",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dayOfWeek: smallint("day_of_week").notNull(),
    opensAt: time("opens_at", { withTimezone: false }),
    closesAt: time("closes_at", { withTimezone: false }),
    isClosed: boolean("is_closed").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    dayIndex: index("opening_hours_day_idx").on(table.dayOfWeek),
  }),
);

export const openingExceptions = pgTable(
  "opening_exceptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: date("date").notNull(),
    opensAt: time("opens_at", { withTimezone: false }),
    closesAt: time("closes_at", { withTimezone: false }),
    isClosed: boolean("is_closed").notNull().default(false),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    dateIndex: uniqueIndex("opening_exceptions_date_key").on(table.date),
  }),
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email"),
    phone: text("phone"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    preferredName: text("preferred_name"),
    notes: text("notes"),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIndex: index("customers_email_idx").on(table.email),
  }),
);

const tstzRange = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tstzrange";
  },
});

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    status: appointmentStatusEnum("status").notNull().default("pending"),
    slot: tstzRange("slot").notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("CHF"),
    notes: text("notes"),
    cancellationReason: text("cancellation_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    staffIdx: index("appointments_staff_idx").on(table.staffId),
    customerIdx: index("appointments_customer_idx").on(table.customerId),
    serviceIdx: index("appointments_service_idx").on(table.serviceId),
  }),
);

export const appointmentEvents = pgTable(
  "appointment_events",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    eventType: appointmentEventEnum("event_type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    appointmentIdx: index("appointment_events_appointment_idx").on(table.appointmentId),
  }),
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    defaultPriceCents: integer("default_price_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("CHF"),
    taxRate: numeric("tax_rate", { precision: 4, scale: 2 }).default("7.70"),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIndex: uniqueIndex("products_slug_key").on(table.slug),
    nameIdx: index("products_name_idx").on(table.name),
  }),
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku"),
    priceCents: integer("price_cents"),
    currency: char("currency", { length: 3 }),
    stockTracking: boolean("stock_tracking").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productIdx: index("product_variants_product_idx").on(table.productId),
    skuIdx: uniqueIndex("product_variants_sku_key").on(table.sku),
  }),
);

export const stockItems = pgTable(
  "stock_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    location: text("location"),
    threshold: integer("threshold").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    variantIdx: uniqueIndex("stock_items_variant_key").on(table.variantId),
  }),
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    movementType: stockMovementTypeEnum("movement_type").notNull(),
    quantityChange: integer("quantity_change").notNull(),
    reason: text("reason"),
    referenceId: uuid("reference_id"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    variantIdx: index("stock_movements_variant_idx").on(table.variantId),
    occurredIdx: index("stock_movements_occurred_idx").on(table.occurredAt),
  }),
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id")
      .references(() => customers.id, { onDelete: "set null" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    status: orderStatusEnum("status").notNull().default("draft"),
    totalCents: integer("total_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    currency: char("currency", { length: 3 }).notNull().default("CHF"),
    notes: text("notes"),
    source: text("source").default("in_store"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    customerIdx: index("orders_customer_idx").on(table.customerId),
    statusIdx: index("orders_status_idx").on(table.status),
  }),
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    description: text("description"),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index("order_items_order_idx").on(table.orderId),
  }),
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("CHF"),
    provider: text("provider").notNull(),
    providerPaymentId: text("provider_payment_id"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index("payments_order_idx").on(table.orderId),
    providerIdx: index("payments_provider_idx").on(table.provider),
  }),
);

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("CHF"),
    reason: refundReasonEnum("reason").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    paymentIdx: index("refunds_payment_idx").on(table.paymentId),
  }),
);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 32 }).notNull(),
    description: text("description"),
    discountType: couponDiscountTypeEnum("discount_type").notNull(),
    discountValue: numeric("discount_value", { precision: 6, scale: 2 }).notNull(),
    maxRedemptions: integer("max_redemptions"),
    redeemedCount: integer("redeemed_count").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: uniqueIndex("coupons_code_key").on(table.code),
  }),
);

export const giftCards = pgTable(
  "gift_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 32 }).notNull(),
    initialBalanceCents: integer("initial_balance_cents").notNull(),
    balanceCents: integer("balance_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("CHF"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    issuedToCustomerId: uuid("issued_to_customer_id").references(() => customers.id, { onDelete: "set null" }),
    issuedBy: uuid("issued_by").references(() => users.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: uniqueIndex("gift_cards_code_key").on(table.code),
  }),
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    channel: notificationChannelEnum("channel").notNull(),
    recipient: text("recipient"),
    subject: text("subject"),
    payload: jsonb("payload").notNull().default({}),
    status: notificationStatusEnum("status").notNull().default("pending"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => ({
    statusIdx: index("notifications_status_idx").on(table.status),
  }),
);

export const emailTemplates = pgTable(
  "email_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    subject: text("subject").notNull(),
    bodyMarkdown: text("body_markdown").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("email_templates_slug_key").on(table.slug),
  }),
);

export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorType: text("actor_type").notNull().default("user"),
  action: text("action").notNull(),
  targetTable: text("target_table").notNull(),
  targetId: uuid("target_id"),
  description: text("description"),
  changes: jsonb("changes").notNull().default({}),
  metadata: jsonb("metadata").notNull().default({}),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  customer: one(customers, {
    fields: [appointments.customerId],
    references: [customers.id],
  }),
  staff: one(staff, {
    fields: [appointments.staffId],
    references: [staff.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
}));

export const roleAssignmentsRelations = relations(roleAssignments, ({ one }) => ({
  user: one(users, {
    fields: [roleAssignments.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [roleAssignments.roleCode],
    references: [roles.code],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  stockItem: one(stockItems, {
    fields: [productVariants.id],
    references: [stockItems.variantId],
  }),
}));

export const stockItemsRelations = relations(stockItems, ({ one }) => ({
  variant: one(productVariants, {
    fields: [stockItems.variantId],
    references: [productVariants.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  payments: many(payments),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  service: one(services, {
    fields: [orderItems.serviceId],
    references: [services.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  refunds: many(refunds),
}));
