import { NextResponse } from 'next/server';
import { createRequestLogger } from '@schnittwerk/lib';

export const dynamic = 'force-dynamic';

export function GET() {
  const requestId = crypto.randomUUID();
  const logger = createRequestLogger({ requestId, scope: 'readiness' });
  logger.info('readiness_check_ok', {
    dependencies: {
      database: 'pending-phase-1',
      redis: 'pending-phase-1',
      payments: 'pending-phase-3',
    },
  });
  return NextResponse.json({
    status: 'ready',
    pendingIntegrations: ['database', 'redis', 'payments'],
    request_id: requestId,
    timestamp: new Date().toISOString(),
  });
}
