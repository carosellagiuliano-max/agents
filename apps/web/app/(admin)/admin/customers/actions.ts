'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { eq, schema } from '@schnittwerk/db';

import { getDatabase } from '@/lib/db';
import { ensureCurrentActorRoles } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';

const CUSTOMER_ROLES = ['owner', 'admin', 'manager', 'reception'];

const marketingSchema = z.object({
  customerId: z.string().uuid(),
  marketingOptIn: z.enum(['true', 'false']).transform((value) => value === 'true'),
});

const anonymizeSchema = z.object({
  customerId: z.string().uuid(),
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

export async function updateMarketingConsentAction(formData: FormData): Promise<never> {
  const actor = ensureCurrentActorRoles(CUSTOMER_ROLES);

  try {
    const { customerId, marketingOptIn } = marketingSchema.parse(Object.fromEntries(formData));
    const db = getDatabase();
    await db
      .update(schema.customers)
      .set({ marketingOptIn, updatedAt: new Date() })
      .where(eq(schema.customers.id, customerId));

    await recordAuditEvent({
      actor,
      action: 'update_marketing_consent',
      targetTable: 'customers',
      targetId: customerId,
      changes: { marketingOptIn },
    });

    revalidatePath('/admin/customers');
    redirectWithMessage('/admin/customers', {
      notice: marketingOptIn ? 'Marketing-Einwilligung aktiviert.' : 'Marketing-Einwilligung widerrufen.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Aktion fehlgeschlagen.';
    redirectWithMessage('/admin/customers', { error: message });
  }
}

export async function anonymizeCustomerAction(formData: FormData): Promise<never> {
  const actor = ensureCurrentActorRoles(CUSTOMER_ROLES);

  try {
    const { customerId } = anonymizeSchema.parse(Object.fromEntries(formData));
    const db = getDatabase();
    await db.transaction(async (tx) => {
      await tx
        .update(schema.customers)
        .set({
          email: null,
          phone: null,
          firstName: null,
          lastName: null,
          preferredName: null,
          notes: null,
          marketingOptIn: false,
          updatedAt: new Date(),
        })
        .where(eq(schema.customers.id, customerId));
    });

    await recordAuditEvent({
      actor,
      action: 'anonymize_customer',
      targetTable: 'customers',
      targetId: customerId,
      description: 'Kund:innendaten anonymisiert (Löschanfrage)',
      changes: { marketingOptIn: false },
    });

    revalidatePath('/admin/customers');
    redirectWithMessage('/admin/customers', { notice: 'Kund:innendaten wurden anonymisiert.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Anonymisierung fehlgeschlagen.';
    redirectWithMessage('/admin/customers', { error: message });
  }
}
