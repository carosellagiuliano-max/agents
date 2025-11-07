import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { isApiError } from './errors';

export function handleRouteError(error: unknown) {
  if (isApiError(error)) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details ?? null,
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        issues: error.flatten(),
      },
      { status: 422 },
    );
  }

  console.error('[booking-api] unexpected error', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
