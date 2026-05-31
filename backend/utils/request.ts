import { createMiddleware } from 'hono/factory';
import { sendResponse } from './response';
import RouteResponseError from 'types/RouteResponseError';

// Types
import type { Context } from 'hono';
import type { Socket } from 'socket.io';

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

  return forwarded ?? forwardedFor ?? realIP;
}

export function getCountryFromRequest(c: Context): string | undefined {
  const passthrough = c.req.header('nextjs-passthrough-ip-country') as string;
  const cfIPCountry = c.req.header('cf-ipcountry') as string;
  if (passthrough) return passthrough;
  if (cfIPCountry) return cfIPCountry;

  return process.env.NODE_ENV !== 'production' ? 'US' : undefined;
}

export function getIPFromSocket(socket: Socket): string | undefined {
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
