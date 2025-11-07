'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { eq, schema } from '@schnittwerk/db';

import { getDatabase } from '@/lib/db';
import { ensureCurrentActorRoles } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';

import { parseInventoryCsv } from './logic';

const INVENTORY_ROLES = ['owner', 'admin', 'manager'];

const countSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int(),
  reason: z.string().max(120).optional(),
  notes: z.string().max(280).optional(),
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

export async function recordStockCountAction(formData: FormData): Promise<never> {
  const actor = ensureCurrentActorRoles(INVENTORY_ROLES);

  try {
    const { variantId, quantity, reason, notes } = countSchema.parse(Object.fromEntries(formData));
    const db = getDatabase();
    const variant = await db.query.productVariants.findFirst({
      where: (variants, { eq: eqVariant }) => eqVariant(variants.id, variantId),
      columns: { id: true, sku: true },
      with: {
        stockItem: { columns: { id: true, quantity: true } },
        product: { columns: { name: true } },
      },
    });

    if (!variant) {
      throw new Error('Variante wurde nicht gefunden.');
    }

    const currentQuantity = variant.stockItem?.quantity ?? 0;
    const delta = quantity - currentQuantity;

    await db.transaction(async (tx) => {
      await tx
        .insert(schema.stockItems)
        .values({ variantId, quantity, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: schema.stockItems.variantId,
          set: { quantity, updatedAt: new Date() },
        });

      await tx.insert(schema.stockMovements).values({
        variantId,
        movementType: 'inventory',
        quantityChange: delta,
        reason: reason ?? 'inventory_count',
        notes,
        createdBy: actor.id ?? null,
      });
    });

    await recordAuditEvent({
      actor,
      action: 'inventory_count',
      targetTable: 'stock_items',
      targetId: variant.stockItem?.id ?? null,
      description: 'Bestand per Inventurzählung angepasst',
      changes: { delta, quantity },
      metadata: { sku: variant.sku, productName: variant.product?.name },
    });

    revalidatePath('/admin/inventory');
    redirectWithMessage('/admin/inventory', {
      notice: `Inventur für SKU ${variant.sku} gespeichert (${delta >= 0 ? '+' : ''}${delta}).`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Inventur konnte nicht gespeichert werden.';
    redirectWithMessage('/admin/inventory', { error: message });
  }
}

export async function importInventoryCsvAction(formData: FormData): Promise<never> {
  const actor = ensureCurrentActorRoles(INVENTORY_ROLES);

  try {
    const file = formData.get('file');
    const inlineText = formData.get('csv');
    let csvText = '';
    if (file instanceof File) {
      csvText = await file.text();
    } else if (typeof file === 'string') {
      csvText = file;
    } else if (typeof inlineText === 'string') {
      csvText = inlineText;
    }

    if (!csvText.trim()) {
      throw new Error('Keine CSV-Daten übergeben.');
    }

    const rows = parseInventoryCsv(csvText);
    if (!rows.length) {
      throw new Error('Die CSV enthielt keine verwertbaren Zeilen.');
    }

    const db = getDatabase();
    const errors: string[] = [];
    let processed = 0;

    await db.transaction(async (tx) => {
      for (const row of rows) {
        const variant = await tx.query.productVariants.findFirst({
          where: (variants, { eq: eqVariant }) => eqVariant(variants.sku, row.sku),
          columns: { id: true, sku: true },
          with: {
            stockItem: { columns: { id: true, quantity: true } },
            product: { columns: { name: true } },
          },
        });

        if (!variant) {
          errors.push(`Unbekannte SKU ${row.sku}`);
          continue;
        }

        const currentQuantity = variant.stockItem?.quantity ?? 0;
        const delta = row.quantity - currentQuantity;

        await tx
          .insert(schema.stockItems)
          .values({ variantId: variant.id, quantity: row.quantity, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: schema.stockItems.variantId,
            set: { quantity: row.quantity, updatedAt: new Date() },
          });

        await tx.insert(schema.stockMovements).values({
          variantId: variant.id,
          movementType: 'inventory',
          quantityChange: delta,
          reason: row.reason ?? 'inventory_import',
          notes: row.notes,
          createdBy: actor.id ?? null,
        });

        processed += 1;
      }
    });

    await recordAuditEvent({
      actor,
      action: 'inventory_import',
      targetTable: 'stock_items',
      description: 'Inventur via CSV importiert',
      changes: { processed, errors },
    });

    revalidatePath('/admin/inventory');
    if (errors.length) {
      redirectWithMessage('/admin/inventory', {
        error: `Import mit Warnungen (${errors.length} Fehler) abgeschlossen.`,
        notice: `${processed} Positionen aktualisiert.`,
      });
    } else {
      redirectWithMessage('/admin/inventory', { notice: `${processed} Positionen erfolgreich aktualisiert.` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CSV Import fehlgeschlagen.';
    redirectWithMessage('/admin/inventory', { error: message });
  }
}
