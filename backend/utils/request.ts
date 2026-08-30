import { createMiddleware } from 'hono/factory';

// Utils
import { sendResponse } from './response';
import { secretsEqual } from './secrets';
import { readEnv } from './env';
import { preferIPv4 } from './ip';
import RouteResponseError from 'types/RouteResponseError';

// Types
import type { Context } from 'hono';
import type { TypedSocket } from 'types/SocketEvents';

// Hono's compose catches Error subclasses and routes them to app.onError
// before middleware try/catch around await next() can see them. Prefer
// handleRouteError from app.onError; this middleware only covers non-Error throws.
export async function handleRouteError(err: unknown, c: Context) {
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

export const withRouteErrorHandling = createMiddleware(async (c, next) => {
  try {
    await next();
  } catch (err) {
    return handleRouteError(err, c);
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

function hasValidPassthroughToken(token: string | undefined): boolean {
  const expected = readEnv('NEXTJS_PASSTHROUGH_TOKEN');
  if (!expected || !token) return false;

  return secretsEqual(token, expected);
}

export function isTrustedNextPassthrough(c: Context): boolean {
  return hasValidPassthroughToken(c.req.header('nextjs-passthrough-token') ?? undefined);
}

export function getIPFromRequest(c: Context): string | undefined {
  if (process.env.NODE_ENV === 'development') return '140.174.21.171';

  const passthroughToken = c.req.header('nextjs-passthrough-token') ?? undefined;
  const passthroughIp = c.req.header('nextjs-passthrough-ip')?.trim();

  // Only trust Next SSR-forwarded client IP when the shared secret matches.
  // Do not mix with CF headers on this hop — those would be the Next server, or spoofable.
  if (passthroughIp && hasValidPassthroughToken(passthroughToken)) {
    return preferIPv4([ passthroughIp ]);
  }

  // Ignore spoofable X-Forwarded-For / X-Real-IP from untrusted clients.
  return preferIPv4([
    c.req.header('cf-connecting-ip')?.trim(),
    c.req.header('cf-connecting-ipv6')?.trim(),
  ]);
}

export function getUserAgentFromRequest(c: Context): string | undefined {
  const passthroughToken = c.req.header('nextjs-passthrough-token') ?? undefined;
  const passthrough = c.req.header('nextjs-passthrough-user-agent');

  if (passthrough && hasValidPassthroughToken(passthroughToken)) {
    return passthrough;
  }

  return c.req.header('user-agent') || undefined;
}

const CLOUDFLARE_UNKNOWN_COUNTRY = 'XX';
const CLOUDFLARE_TOR_COUNTRY = 'T1';

export function getRawIpCountryFromRequest(c: Context): string | undefined {
  if (process.env.NODE_ENV === 'development') return 'US';

  const passthroughToken = c.req.header('nextjs-passthrough-token') ?? undefined;
  const passthrough = c.req.header('nextjs-passthrough-ip-country')?.trim();
  const cfIPCountry = c.req.header('cf-ipcountry')?.trim();

  if (passthrough && hasValidPassthroughToken(passthroughToken)) {
    return passthrough || undefined;
  }

  if (cfIPCountry) return cfIPCountry;

  return undefined;
}

export function isTorRequest(c: Context): boolean {
  return getRawIpCountryFromRequest(c) === CLOUDFLARE_TOR_COUNTRY;
}

export function getCountryFromRequest(c: Context): string | undefined {
  const country = getRawIpCountryFromRequest(c);
  if (!country || country === CLOUDFLARE_UNKNOWN_COUNTRY || country === CLOUDFLARE_TOR_COUNTRY) {
    return undefined;
  }

  return country;
}

export function getCityFromRequest(c: Context): string | undefined {
  if (process.env.NODE_ENV === 'development') return 'Dallas';

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
  const cfIpv6 = socket.handshake.headers['cf-connecting-ipv6'];

  return preferIPv4([
    typeof cfIp === 'string' ? cfIp : undefined,
    typeof cfIpv6 === 'string' ? cfIpv6 : undefined,
  ]);
}
