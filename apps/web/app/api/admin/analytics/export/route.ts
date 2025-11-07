import { NextRequest, NextResponse } from 'next/server';

import { getRequestActor, requireRole } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';

import { ANALYTICS_ROLES, fetchAnalyticsMetrics } from '@/app/(admin)/admin/analytics/data';
import { buildAnalyticsCsv } from '@/app/(admin)/admin/analytics/csv';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const actor = getRequestActor(request);
  requireRole(actor, ANALYTICS_ROLES);

  const metrics = await fetchAnalyticsMetrics();
  const csv = buildAnalyticsCsv(metrics);

  await recordAuditEvent({
    actor,
    action: 'export_analytics_csv',
    targetTable: 'analytics',
    description: 'Analytics CSV export ausgelöst',
    metadata: {
      services: metrics.services.length,
      channels: metrics.channels.length,
      appointments: metrics.appointments.length,
      customers: metrics.customers.length,
    },
  });

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="schnittwerk-analytics.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
