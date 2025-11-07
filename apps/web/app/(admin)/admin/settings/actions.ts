'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { and, eq, schema } from '@schnittwerk/db';

import { getDatabase } from '@/lib/db';
import { ensureCurrentActorRoles } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';

const SETTINGS_ROLES = ['owner', 'admin'];
const ROLE_ADMIN_ROLES = ['owner'];
const MANAGED_ROLES = ['owner', 'admin', 'manager', 'reception', 'stylist'];

const bookingSchema = z.object({
  onlineBookingEnabled: z.enum(['true', 'false']).transform((value) => value === 'true'),
  requireDeposit: z.enum(['true', 'false']).transform((value) => value === 'true'),
  cancellationWindow: z.coerce.number().int().min(0).max(168),
});

function redirectWithMessage(path: string, params: { notice?: string; error?: string }): never {
  const search = new URLSearchParams();
  if (params.notice) {
    search.set('notice', params.notice);
  }
  if (params.error) {
    search.set('error', params.error);
  }
  redirect(`${path}?${search.toString()}`);
}

export async function updateBookingSettingsAction(formData: FormData): Promise<never> {
  const actor = ensureCurrentActorRoles(SETTINGS_ROLES);

  try {
    const { onlineBookingEnabled, requireDeposit, cancellationWindow } = bookingSchema.parse(
      Object.fromEntries(formData),
    );
    const db = getDatabase();
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .insert(schema.settings)
        .values({
          key: 'booking.online_enabled',
          value: onlineBookingEnabled,
          updatedAt: now,
          updatedBy: actor.id ?? null,
        })
        .onConflictDoUpdate({
          target: schema.settings.key,
          set: { value: onlineBookingEnabled, updatedAt: now, updatedBy: actor.id ?? null },
        });

      await tx
        .insert(schema.settings)
        .values({
          key: 'booking.require_deposit',
          value: requireDeposit,
          updatedAt: now,
          updatedBy: actor.id ?? null,
        })
        .onConflictDoUpdate({
          target: schema.settings.key,
          set: { value: requireDeposit, updatedAt: now, updatedBy: actor.id ?? null },
        });

      await tx
        .insert(schema.settings)
        .values({
          key: 'booking.cancellation_window_hours',
          value: cancellationWindow,
          updatedAt: now,
          updatedBy: actor.id ?? null,
        })
        .onConflictDoUpdate({
          target: schema.settings.key,
          set: { value: cancellationWindow, updatedAt: now, updatedBy: actor.id ?? null },
        });
    });

    await recordAuditEvent({
      actor,
      action: 'update_booking_settings',
      targetTable: 'settings',
      description: 'Booking-Einstellungen aktualisiert',
      changes: {
        onlineBookingEnabled,
        requireDeposit,
        cancellationWindow,
      },
    });

    revalidatePath('/admin/settings');
    redirectWithMessage('/admin/settings', { notice: 'Buchungseinstellungen gespeichert.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Einstellungen konnten nicht gespeichert werden.';
    redirectWithMessage('/admin/settings', { error: message });
  }
}

export async function upsertOpeningHoursAction(formData: FormData): Promise<never> {
  const actor = ensureCurrentActorRoles(SETTINGS_ROLES);

  try {
    const entries: Array<{ dayOfWeek: number; isClosed: boolean; opensAt: string | null; closesAt: string | null }> = [];
    for (let day = 0; day < 7; day += 1) {
      const isClosed = formData.get(`day-${day}-closed`) === 'on';
      const opens = formData.get(`day-${day}-opens`);
      const closes = formData.get(`day-${day}-closes`);

      if (!isClosed && (!opens || !closes)) {
        throw new Error('Für offene Tage müssen Öffnungs- und Schliesszeiten gesetzt werden.');
      }

      entries.push({
        dayOfWeek: day,
        isClosed,
        opensAt: isClosed ? null : (typeof opens === 'string' && opens ? opens : null),
        closesAt: isClosed ? null : (typeof closes === 'string' && closes ? closes : null),
      });
    }

    const db = getDatabase();
    await db.transaction(async (tx) => {
      await tx.delete(schema.openingHours);
      for (const entry of entries) {
        await tx.insert(schema.openingHours).values({
          dayOfWeek: entry.dayOfWeek,
          isClosed: entry.isClosed,
          opensAt: entry.opensAt,
          closesAt: entry.closesAt,
          updatedAt: new Date(),
        });
      }
    });

    await recordAuditEvent({
      actor,
      action: 'update_opening_hours',
      targetTable: 'opening_hours',
      description: 'Öffnungszeiten aktualisiert',
    });

    revalidatePath('/admin/settings');
    redirectWithMessage('/admin/settings', { notice: 'Öffnungszeiten gespeichert.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Öffnungszeiten konnten nicht gespeichert werden.';
    redirectWithMessage('/admin/settings', { error: message });
  }
}

const exceptionSchema = z.object({
  date: z.string().min(10),
  isClosed: z.enum(['true', 'false']).transform((value) => value === 'true'),
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
  reason: z.string().max(160).optional(),
});

export async function addOpeningExceptionAction(formData: FormData): Promise<never> {
  const actor = ensureCurrentActorRoles(SETTINGS_ROLES);

  try {
    const { date, isClosed, opensAt, closesAt, reason } = exceptionSchema.parse(Object.fromEntries(formData));
    if (!isClosed && (!opensAt || !closesAt)) {
      throw new Error('Für Sonderöffnungszeiten sind Start- und Endzeit erforderlich.');
    }

    const db = getDatabase();
    await db.insert(schema.openingExceptions).values({
      date,
      isClosed,
      opensAt: isClosed ? null : opensAt ?? null,
      closesAt: isClosed ? null : closesAt ?? null,
      reason,
    });

    await recordAuditEvent({
      actor,
      action: 'add_opening_exception',
      targetTable: 'opening_exceptions',
      description: 'Öffnungsausnahme eingetragen',
      metadata: { date, reason },
    });

    revalidatePath('/admin/settings');
    redirectWithMessage('/admin/settings', { notice: 'Sonderöffnungszeit gespeichert.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sonderöffnungszeit konnte nicht gespeichert werden.';
    redirectWithMessage('/admin/settings', { error: message });
  }
}

const deleteExceptionSchema = z.object({
  exceptionId: z.string().uuid(),
});

export async function deleteOpeningExceptionAction(formData: FormData): Promise<never> {
  const actor = ensureCurrentActorRoles(SETTINGS_ROLES);

  try {
    const { exceptionId } = deleteExceptionSchema.parse(Object.fromEntries(formData));
    const db = getDatabase();
    await db.delete(schema.openingExceptions).where(eq(schema.openingExceptions.id, exceptionId));

    await recordAuditEvent({
      actor,
      action: 'delete_opening_exception',
      targetTable: 'opening_exceptions',
      targetId: exceptionId,
      description: 'Sonderöffnungszeit entfernt',
    });

    revalidatePath('/admin/settings');
    redirectWithMessage('/admin/settings', { notice: 'Sonderöffnungszeit gelöscht.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sonderöffnungszeit konnte nicht gelöscht werden.';
    redirectWithMessage('/admin/settings', { error: message });
  }
}

const staffSchema = z.object({
  staffId: z.string().uuid(),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true'),
});

export async function toggleStaffStatusAction(formData: FormData): Promise<never> {
  const actor = ensureCurrentActorRoles(SETTINGS_ROLES);

  try {
    const { staffId, isActive } = staffSchema.parse(Object.fromEntries(formData));
    const db = getDatabase();
    await db
      .update(schema.staff)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(schema.staff.id, staffId));

    await recordAuditEvent({
      actor,
      action: 'update_staff_status',
      targetTable: 'staff',
      targetId: staffId,
      description: 'Mitarbeiterstatus angepasst',
      changes: { isActive },
    });

    revalidatePath('/admin/settings');
    redirectWithMessage('/admin/settings', { notice: 'Teamstatus aktualisiert.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Teamstatus konnte nicht aktualisiert werden.';
    redirectWithMessage('/admin/settings', { error: message });
  }
}

const roleAssignmentSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'manager', 'reception', 'stylist', 'customer']),
  intent: z.enum(['assign', 'remove']),
});

export async function updateRoleAssignmentAction(formData: FormData): Promise<never> {
  const actor = ensureCurrentActorRoles(ROLE_ADMIN_ROLES);

  try {
    const { userId, role, intent } = roleAssignmentSchema.parse(Object.fromEntries(formData));
    if (!MANAGED_ROLES.includes(role) && role !== 'customer') {
      throw new Error('Unbekannte Rolle.');
    }

    const db = getDatabase();
    if (intent === 'assign') {
      await db
        .insert(schema.roleAssignments)
        .values({ userId, roleCode: role })
        .onConflictDoNothing();
    } else {
      await db
        .delete(schema.roleAssignments)
        .where(and(eq(schema.roleAssignments.userId, userId), eq(schema.roleAssignments.roleCode, role)));
    }

    await recordAuditEvent({
      actor,
      action: 'update_role_assignment',
      targetTable: 'role_assignments',
      description: `${intent === 'assign' ? 'Rolle zugewiesen' : 'Rolle entfernt'}`,
      metadata: { userId, role, intent },
    });

    revalidatePath('/admin/settings');
    redirectWithMessage('/admin/settings', { notice: 'Rollen wurden aktualisiert.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Rollen konnten nicht aktualisiert werden.';
    redirectWithMessage('/admin/settings', { error: message });
  }
}
