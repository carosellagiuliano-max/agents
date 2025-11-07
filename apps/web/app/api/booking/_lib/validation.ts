import { z } from 'zod';

export const availabilityQuerySchema = z
  .object({
    serviceId: z.string().uuid({ message: 'serviceId must be a valid UUID' }),
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
    staffId: z.string().uuid({ message: 'staffId must be a valid UUID' }).optional(),
  })
  .refine((value) => new Date(value.to).getTime() > new Date(value.from).getTime(), {
    path: ['to'],
    message: 'to must be after from',
  });

export const customerInputSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(5).max(32).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  marketingOptIn: z.boolean().optional(),
  notes: z.string().max(1024).optional(),
});

export const bookingCreateSchema = z.object({
  idempotencyKey: z.string().min(8).max(64),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().optional(),
  start: z.string().datetime({ offset: true }),
  customer: customerInputSchema,
  notes: z.string().max(1024).optional(),
  locale: z.string().default('de-CH'),
});

export const bookingCancelSchema = z.object({
  appointmentId: z.string().uuid(),
  reason: z.string().min(3).max(512),
  actorId: z.string().uuid().optional(),
});

export const bookingRescheduleRequestSchema = z.object({
  appointmentId: z.string().uuid(),
  requestedStart: z.string().datetime({ offset: true }),
  notes: z.string().max(1024).optional(),
  actorId: z.string().uuid().optional(),
});

export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type BookingCancelInput = z.infer<typeof bookingCancelSchema>;
export type BookingRescheduleRequestInput = z.infer<
  typeof bookingRescheduleRequestSchema
>;
