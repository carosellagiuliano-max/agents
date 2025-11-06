import { NextResponse } from 'next/server';

/**
 * Health check endpoint
 * Returns basic application health status
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'schnittwerk-web',
    },
    { status: 200 }
  );
}
