import { pgEnum } from "drizzle-orm/pg-core";

export const userStatusEnum = pgEnum("user_status", [
  "invited",
  "active",
  "suspended",
  "archived",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

export const appointmentEventEnum = pgEnum("appointment_event", [
  "created",
  "updated",
  "confirmed",
  "cancelled",
  "rescheduled",
  "completed",
  "no_show",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "pending",
  "awaiting_payment",
  "paid",
  "fulfilled",
  "cancelled",
  "refunded",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "authorized",
  "captured",
  "failed",
  "refunded",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "queued",
  "sent",
  "failed",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "sms",
  "webhook",
  "push",
]);

export const refundReasonEnum = pgEnum("refund_reason", [
  "customer_request",
  "service_issue",
  "payment_failure",
  "other",
]);

export const couponDiscountTypeEnum = pgEnum("coupon_discount_type", [
  "percentage",
  "fixed_amount",
]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "adjustment",
  "sale",
  "restock",
  "transfer",
  "inventory",
]);
