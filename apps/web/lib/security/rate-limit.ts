import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type RateLimitScope = 'booking' | 'auth';

type RateLimitResult = {
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
};

const redisUrl = process.env.UPSTASH_REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_TOKEN;

const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const limiters: Partial<Record<RateLimitScope, Ratelimit>> = redis
  ? {
      booking: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '10 m'),
        analytics: true,
        prefix: 'rl:booking',
      }),
      auth: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(8, '10 m'),
        analytics: true,
        prefix: 'rl:auth',
      }),
    }
  : {};

export function getClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const [first] = forwarded.split(',');
    if (first) {
      return first.trim();
    }
  }

  return request.ip ?? undefined;
}

export async function checkRateLimit(request: NextRequest, scope: RateLimitScope): Promise<RateLimitResult> {
  const limiter = limiters[scope];
  if (!limiter) {
    return { success: true };
  }

  try {
    const identifier = getClientIp(request) ?? 'unknown';
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    } satisfies RateLimitResult;
  } catch (error) {
    console.error(`[rate-limit] failed to evaluate scope=${scope}`, error);
    return { success: true };
  }
}

export function rateLimitAvailable(): boolean {
  return Boolean(redis);
}
