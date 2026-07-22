import { timingSafeEqual } from 'crypto';
import { createMiddleware } from 'hono/factory';
import { sendResponse } from './response';
import RouteResponseError from 'types/RouteResponseError';

// Types
import type { Context } from 'hono';
import type { TypedSocket } from 'types/SocketEvents';

export const withRouteErrorHandling = createMiddleware(async (c, next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof RouteResponseError) {
      return sendResponse({
        c,
        status: err.status,
        success: err.response.success,
        message: err.response.message,
      });
    }
    console.error(err);

    return sendResponse({ c, status: 500, success: false, message: 'Internal server error.' });
  }
});

export function normalizeQuery(
  query: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const normalized: Record<string, string | undefined> = {};
  for (const [ key, value ] of Object.entries(query)) {
    if (value === undefined) {
      normalized[key] = undefined;
      continue;
    }
    normalized[key] = Array.isArray(value) ? value[0] : value;
  }

  return normalized;
}

function secretsMatch(provided: string, expected: string): boolean {
  const providedBytes = new TextEncoder().encode(provided);
  const expectedBytes = new TextEncoder().encode(expected);

  if (providedBytes.length !== expectedBytes.length) return false;

  return timingSafeEqual(providedBytes, expectedBytes);
}

function hasValidPassthroughToken(token: string | undefined): boolean {
  const expected = process.env.NEXTJS_PASSTHROUGH_TOKEN;
  if (!expected || !token) return false;

  return secretsMatch(token, expected);
}

export function getIPFromRequest(c: Context): string | undefined {
  if (process.env.NODE_ENV !== 'production') return '140.174.21.171';

  const passthroughToken = c.req.header('nextjs-passthrough-token') ?? undefined;
  const passthroughIp = c.req.header('nextjs-passthrough-ip')?.trim();

  // Only trust Next SSR-forwarded client IP when the shared secret matches.
  if (passthroughIp && hasValidPassthroughToken(passthroughToken)) {
    return passthroughIp;
  }

  const cfIp = c.req.header('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;

  // Ignore spoofable X-Forwarded-For / X-Real-IP from untrusted clients.
  return undefined;
}

export function getUserAgentFromRequest(c: Context): string | undefined {
  const passthroughToken = c.req.header('nextjs-passthrough-token') ?? undefined;
  const passthrough = c.req.header('nextjs-passthrough-user-agent');

  if (passthrough && hasValidPassthroughToken(passthroughToken)) {
    return passthrough;
  }

  return c.req.header('user-agent') || undefined;
}

export function getCountryFromRequest(c: Context): string | undefined {
  if (process.env.NODE_ENV !== 'production') return 'US';

  const passthroughToken = c.req.header('nextjs-passthrough-token') ?? undefined;
  const passthrough = c.req.header('nextjs-passthrough-ip-country')?.trim();
  const cfIPCountry = c.req.header('cf-ipcountry') as string;

  if (passthrough && hasValidPassthroughToken(passthroughToken)) {
    return passthrough || undefined;
  }

  if (cfIPCountry && cfIPCountry !== 'XX' && cfIPCountry !== 'T1') return cfIPCountry;

  return undefined;
}

export function getCityFromRequest(c: Context): string | undefined {
  if (process.env.NODE_ENV !== 'production') return 'Dallas';

  const passthroughToken = c.req.header('nextjs-passthrough-token') ?? undefined;
  const passthrough = c.req.header('nextjs-passthrough-ip-city');
  const cfIPCity = c.req.header('cf-ipcity') as string;
  const city = (
    passthrough && hasValidPassthroughToken(passthroughToken)
      ? passthrough
      : cfIPCity
  );

  if (!city) return undefined;

  try {
    return decodeURIComponent(city.replace(/\+/g, ' ')).trim() || undefined;
  } catch {
    return city.trim() || undefined;
  }
}

export function getIPFromSocket(socket: TypedSocket): string | undefined {
  const cfIp = socket.handshake.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) return cfIp.trim();

  // Socket handshakes should not honor client-spoofable forwarded headers.
  return undefined;
}
