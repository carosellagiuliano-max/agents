import { NextResponse } from 'next/server';
import { createRequestLogger } from '@schnittwerk/lib';

export const dynamic = 'force-dynamic';

export function GET() {
  const requestId = crypto.randomUUID();
  const logger = createRequestLogger({ requestId, scope: 'health' });
  logger.info('health_check_ok');
  return NextResponse.json({ status: 'ok', request_id: requestId, timestamp: new Date().toISOString() });
}
