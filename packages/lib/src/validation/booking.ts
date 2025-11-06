/**
 * Booking Validation Schemas
 * Zod schemas for validating booking-related requests
 */

import { z } from 'zod';

/**
 * Schema for checking availability
 */
export const availabilitySchema = z.object({
  staffId: z.string().uuid('Invalid staff ID'),
  serviceId: z.string().uuid('Invalid service ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export type AvailabilityRequest = z.infer<typeof availabilitySchema>;

/**
 * Schema for creating an appointment
 */
export const createAppointmentSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  staffId: z.string().uuid('Invalid staff ID'),
  serviceId: z.string().uuid('Invalid service ID'),
  startTime: z.string().datetime('Invalid start time'),
  customerNotes: z.string().max(500).optional(),
  // Idempotency key to prevent duplicate bookings
  idempotencyKey: z.string().optional(),
});

export type CreateAppointmentRequest = z.infer<typeof createAppointmentSchema>;

/**
 * Schema for cancelling an appointment
 */
export const cancelAppointmentSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
  reason: z.string().max(500).optional(),
});

export type CancelAppointmentRequest = z.infer<typeof cancelAppointmentSchema>;

/**
 * Schema for requesting appointment reschedule
 */
export const rescheduleRequestSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  preferredTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
    .optional(),
  reason: z.string().max(500).optional(),
});

export type RescheduleRequestRequest = z.infer<typeof rescheduleRequestSchema>;

/**
 * Time slot response type
 */
export const timeSlotSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  available: z.boolean(),
});

export type TimeSlot = z.infer<typeof timeSlotSchema>;
