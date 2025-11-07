import { NextRequest, NextResponse } from 'next/server';

import { sql } from '@schnittwerk/db';

import { getDatabase } from '@/lib/db';
import { getRequestActor, requireRole } from '@/lib/auth';

const CUSTOMER_ROLES = ['owner', 'admin', 'manager', 'reception'];

type ExportRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  marketing_opt_in: boolean;
  created_at: string;
  last_visit: string | null;
  appointment_count: number;
  revenue_cents: number;
};

function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(rows: ExportRow[]): string {
  const header = [
    'id',
    'first_name',
    'last_name',
    'email',
    'phone',
    'marketing_opt_in',
    'created_at',
    'last_visit',
    'appointment_count',
    'revenue_cents',
  ].join(',');

  const lines = rows.map((row) =>
    [
      row.id,
      row.first_name ?? '',
      row.last_name ?? '',
      row.email ?? '',
      row.phone ?? '',
      row.marketing_opt_in ? 'true' : 'false',
      row.created_at,
      row.last_visit ?? '',
      String(row.appointment_count ?? 0),
      String(row.revenue_cents ?? 0),
    ]
      .map((value) => escapeCsv(value))
      .join(','),
  );

  return [header, ...lines].join('\n');
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const actor = getRequestActor(request);
  requireRole(actor, CUSTOMER_ROLES);

  const db = getDatabase();
  const result = await db.execute(
    sql`select c.id, c.first_name, c.last_name, c.email, c.phone, c.marketing_opt_in, c.created_at,
            max(lower(a.slot)) as last_visit,
            coalesce(count(*) filter (where a.status not in ('cancelled', 'no_show')), 0) as appointment_count,
            coalesce(sum(o.total_cents) filter (where o.status in ('paid', 'fulfilled')), 0) as revenue_cents
        from customers c
        left join appointments a on a.customer_id = c.id
        left join orders o on o.customer_id = c.id
        group by c.id
        order by c.created_at desc`,
  );

  const csv = buildCsv(result.rows as ExportRow[]);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="schnittwerk-customers.csv"',
    },
  });
}
