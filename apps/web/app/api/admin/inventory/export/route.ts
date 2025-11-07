import { NextRequest, NextResponse } from 'next/server';

import { sql } from '@schnittwerk/db';

import { getDatabase } from '@/lib/db';
import { getRequestActor, requireRole } from '@/lib/auth';

import { buildInventoryCsv } from '@/app/(admin)/admin/inventory/logic';

const INVENTORY_ROLES = ['owner', 'admin', 'manager'];

type InventoryExportRow = {
  sku: string | null;
  product_name: string;
  variant_name: string;
  quantity: number | null;
  threshold: number | null;
  location: string | null;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const actor = getRequestActor(request);
  requireRole(actor, INVENTORY_ROLES);

  const db = getDatabase();
  const result = await db.execute(
    sql`select v.sku, p.name as product_name, v.name as variant_name, si.quantity, si.threshold, si.location
        from product_variants v
        join products p on p.id = v.product_id
        left join stock_items si on si.variant_id = v.id
        where v.is_active = true
        order by p.name asc, v.name asc`,
  );

  const rows = (result.rows as InventoryExportRow[]).map((row) => ({
    sku: row.sku ?? '',
    quantity: Number.isFinite(row.quantity) ? Number(row.quantity) : 0,
    reason: row.product_name,
    notes: `${row.variant_name}${row.location ? ` (${row.location})` : ''}`,
  }));

  const csv = buildInventoryCsv(rows);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="schnittwerk-inventory.csv"',
    },
  });
}
