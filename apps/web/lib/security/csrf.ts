import { randomBytes, timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './headers';
const CSRF_MAX_AGE_SECONDS = 60 * 60 * 12;

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

function secureEquals(a: string, b: string): boolean {
  const first = Buffer.from(a);
  const second = Buffer.from(b);

  if (first.length !== second.length) {
    return false;
  }

  return timingSafeEqual(new Uint8Array(first), new Uint8Array(second));
}

export function ensureCsrfToken(): string {
  const store = cookies();
  const existing = store.get(CSRF_COOKIE_NAME)?.value;

  if (existing) {
    return existing;
  }

  const token = generateToken();
  store.set({
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: CSRF_MAX_AGE_SECONDS,
  });

  return token;
}

export function getCsrfTokenFromCookies(): string | undefined {
  return cookies().get(CSRF_COOKIE_NAME)?.value;
}

export function tokensMatch(cookieToken: string | null | undefined, headerToken: string | null | undefined): boolean {
  if (!cookieToken || !headerToken) {
    return false;
  }

  try {
    return secureEquals(cookieToken, headerToken);
  } catch (error) {
    console.error('[csrf] failed to compare tokens', error);
    return false;
  }
}

export function requestTokensMatch(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  return tokensMatch(cookieToken, headerToken);
}
