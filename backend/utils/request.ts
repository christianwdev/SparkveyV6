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

export function getIPFromRequest(c: Context): string | undefined {
  let forwarded = c.req.header('cf-connecting-ip') as string;
  const passthrough = c.req.header('nextjs-passthrough-ip') as string;

  if (passthrough) forwarded = passthrough;

  const forwardedFor = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
  const realIP = c.req.header('x-real-ip');

  if (process.env.NODE_ENV !== 'production') return '140.174.21.171';

  return forwarded ?? forwardedFor ?? realIP;
}

export function getUserAgentFromRequest(c: Context): string | undefined {
  const passthrough = c.req.header('nextjs-passthrough-user-agent');
  if (passthrough) return passthrough;

  return c.req.header('user-agent') || undefined;
}

export function getCountryFromRequest(c: Context): string | undefined {
  if (process.env.NODE_ENV !== 'production') return 'US';

  const passthrough = c.req.header('nextjs-passthrough-ip-country') as string;
  const cfIPCountry = c.req.header('cf-ipcountry') as string;

  if (passthrough) return passthrough || undefined;
  if (cfIPCountry && cfIPCountry !== 'XX' && cfIPCountry !== 'T1') return cfIPCountry;

  return undefined;
}

export function getCityFromRequest(c: Context): string | undefined {
  if (process.env.NODE_ENV !== 'production') return 'Dallas';

  const passthrough = c.req.header('nextjs-passthrough-ip-city') as string;
  const cfIPCity = c.req.header('cf-ipcity') as string;
  const city = passthrough || cfIPCity;

  if (!city) return undefined;

  try {
    return decodeURIComponent(city.replace(/\+/g, ' ')).trim() || undefined;
  } catch {
    return city.trim() || undefined;
  }
}

export function getIPFromSocket(socket: TypedSocket): string | undefined {
  let forwarded = socket.handshake.headers['cf-connecting-ip'];
  const passthrough = socket.handshake.headers['nextjs-passthrough-ip'];
  const forwardedFor = socket.handshake.headers['x-forwarded-for'];
  const realIP = socket.handshake.headers['x-real-ip'];
  if (typeof passthrough === 'string') forwarded = passthrough;
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded;
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0]?.trim() || undefined;
  }
  if (typeof realIP === 'string' && realIP.length > 0) return realIP;

  return undefined;
}
