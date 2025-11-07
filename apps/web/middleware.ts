import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function createNonce(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

function buildContentSecurityPolicy(nonce: string): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `'nonce-${nonce}'`, 'https://challenges.cloudflare.com', 'https://js.stripe.com'],
    'style-src': ["'self'", `'nonce-${nonce}'`, 'https://fonts.googleapis.com'],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': [
      "'self'",
      'https://api.sumup.com',
      'https://checkout.sumup.com',
      'https://api.stripe.com',
      'https://challenges.cloudflare.com',
      'https://*.sentry.io',
    ],
    'frame-src': ['https://js.stripe.com', 'https://challenges.cloudflare.com', 'https://checkout.sumup.com'],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'prefetch-src': ["'self'"],
    'worker-src': ["'self'"],
  };

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

function applySecurityHeaders(response: NextResponse, nonce: string): void {
  response.headers.set('Content-Security-Policy', buildContentSecurityPolicy(nonce));
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-site');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
}

export function middleware(request: NextRequest): NextResponse {
  const nonce = createNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  applySecurityHeaders(response, nonce);

  return response;
}

export const config = {
  matcher: '/:path*',
};
