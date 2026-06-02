import { createMiddleware } from 'hono/factory';
import { SLIDING_WINDOW_RATE_LIMIT_LUA_SCRIPT } from 'backend/lua/SlidingWindowRateLimit';
import { getGlobalObject } from 'backend/utils/globalObject';
import { getIPFromRequest } from './request';
import { sendResponse } from './response';

// Types
import type { Context } from 'hono';

export type SlidingWindowLogConfig = {
  maxRequests: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfter: number | null;
};

export type RateLimitOptions = Partial<SlidingWindowLogConfig> & {
  keyPrefix?: string;
  keyGenerator?: (c: Context) => string | undefined;
};

const DEFAULT_CONFIG: SlidingWindowLogConfig = {
  maxRequests: 10,
  windowSeconds: 3,
};

async function attemptRateLimit(
  key: string,
  config: SlidingWindowLogConfig,
  memberSuffix?: string,
): Promise<RateLimitResult> {
  const { redisClient: redis } = getGlobalObject();
  const { maxRequests, windowSeconds } = config;

  const now = Date.now();
  const member = `${now}:${memberSuffix ?? Math.random().toString(36).slice(2)}`;

  const result = (await redis.eval(
    SLIDING_WINDOW_RATE_LIMIT_LUA_SCRIPT,
    1,
    key,
    maxRequests.toString(),
    windowSeconds.toString(),
    now.toString(),
    member,
  )) as Array<string | number>;

  const allowed = Number(result[0]) === 1;
  const remaining = Number(result[1]) || 0;
  const retryAfterMs = Number(result[2]) || 0;

  return {
    allowed,
    remaining,
    limit: maxRequests,
    retryAfter: allowed ? null : Math.max(0, retryAfterMs / 1000),
  };
}

export function rateLimit(options: RateLimitOptions = {}) {
  const config: SlidingWindowLogConfig = {
    maxRequests: options.maxRequests ?? DEFAULT_CONFIG.maxRequests,
    windowSeconds: options.windowSeconds ?? DEFAULT_CONFIG.windowSeconds,
  };
  const keyPrefix = options.keyPrefix ?? 'rate-limit';
  const keyGenerator = options.keyGenerator ?? getIPFromRequest;

  return createMiddleware(async (c, next) => {
    const identifier = keyGenerator(c) ?? 'unknown';
    const result = await attemptRateLimit(`${keyPrefix}:${identifier}`, config);

    c.header('X-RateLimit-Limit', String(result.limit));
    c.header('X-RateLimit-Remaining', String(result.remaining));

    if (!result.allowed) {
      if (result.retryAfter !== null) {
        c.header('Retry-After', String(Math.ceil(result.retryAfter)));
      }

      return sendResponse({
        c,
        status: 429,
        success: false,
        message: 'Too many requests. Please try again later.',
      });
    }

    await next();
  });
}
