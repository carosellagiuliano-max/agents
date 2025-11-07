import type { NextRequest } from 'next/server';

import type { RequestActor } from '@/lib/auth';
import { captchaGuardEnabled, verifyTurnstileToken } from '@/lib/security/captcha';
import { tokensMatch } from '@/lib/security/csrf';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, CAPTCHA_HEADER_NAME } from '@/lib/security/headers';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

import { ApiError } from './errors';

const PUBLIC_ROLES = new Set(['anonymous', 'customer']);

function shouldEnforceCaptcha(actor: RequestActor): boolean {
  if (!captchaGuardEnabled()) {
    return false;
  }

  return actor.roles.some((role) => PUBLIC_ROLES.has(role));
}

function computeRetryAfter(reset?: number): number {
  if (typeof reset !== 'number') {
    return 60;
  }

  const resetMs = reset > 1_000_000_000_000 ? reset : reset * 1000;
  const delta = Math.ceil((resetMs - Date.now()) / 1000);
  return delta > 0 ? delta : 60;
}

export function enforceCsrf(request: NextRequest): void {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!tokensMatch(cookieToken, headerToken)) {
    throw new ApiError('Invalid CSRF token.', 403);
  }
}

async function enforceRateLimit(request: NextRequest, actor: RequestActor): Promise<void> {
  const isPublicActor = actor.roles.some((role) => PUBLIC_ROLES.has(role));
  if (!isPublicActor) {
    return;
  }

  const result = await checkRateLimit(request, 'booking');
  if (result.success) {
    return;
  }

  const retryAfter = computeRetryAfter(result.reset);
  throw new ApiError(
    'Too many booking attempts. Please try again later.',
    429,
    { retryAfterSeconds: retryAfter, limit: result.limit, remaining: result.remaining },
    { headers: { 'Retry-After': String(retryAfter) } },
  );
}

async function enforceCaptcha(request: NextRequest, actor: RequestActor): Promise<void> {
  if (!shouldEnforceCaptcha(actor)) {
    return;
  }

  const captchaToken = request.headers.get(CAPTCHA_HEADER_NAME);
  if (!captchaToken) {
    throw new ApiError('Captcha verification required.', 400);
  }

  const { success, errors } = await verifyTurnstileToken(captchaToken, getClientIp(request));
  if (!success) {
    throw new ApiError('Captcha verification failed.', 400, { errors });
  }
}

export async function enforceBookingGuards(request: NextRequest, actor: RequestActor): Promise<void> {
  enforceCsrf(request);
  await enforceRateLimit(request, actor);
  await enforceCaptcha(request, actor);
}

export function getCaptchaHeaderName(): string {
  return CAPTCHA_HEADER_NAME;
}
