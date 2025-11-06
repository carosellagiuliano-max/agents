import { NextResponse } from 'next/server';

/**
 * Readiness check endpoint
 * Returns whether the application is ready to serve traffic
 * In Phase 0, this is a simple check. Will be enhanced in later phases
 * to check database connectivity, cache availability, etc.
 */
export async function GET() {
  // TODO Phase 1: Add database connectivity check
  // TODO Phase 2: Add Redis connectivity check
  // TODO Phase 3: Add payment provider availability check

  const checks = {
    database: 'not_implemented',
    cache: 'not_implemented',
    payments: 'not_implemented',
  };

  const allReady = Object.values(checks).every((status) => status === 'ok');

  return NextResponse.json(
    {
      ready: allReady,
      timestamp: new Date().toISOString(),
      service: 'schnittwerk-web',
      checks,
    },
    { status: allReady ? 200 : 503 }
  );
}
