import crypto from 'crypto';
import { deleteCookie, setCookie } from 'hono/cookie';

import {
  CSRF_COOKIE_NAME,
  getClearCookieOptions,
  getCsrfCookieOptions,
} from './cookies';
import { secretsEqual } from './secrets';

// Types
import type { Context } from 'hono';

export const CSRF_HEADER_NAME = 'x-csrf-token';
export { CSRF_COOKIE_NAME };

export function createCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function setCsrfCookie(c: Context, maxAge: number): string {
  const csrfToken = createCsrfToken();

  setCookie(c, CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions(maxAge));

  return csrfToken;
}

export function clearCsrfCookie(c: Context) {
  deleteCookie(c, CSRF_COOKIE_NAME, getClearCookieOptions());
}

export function validateCsrf(c: Context) {
  const headerToken = c.req.header(CSRF_HEADER_NAME);
  if (!headerToken) return false;

  // Accept a match against any same-name cookie. Prod + staging both use
  // Domain=.sparkvey.com, so the browser can send two csrfToken values and
  // getCookie() would only see one of them.
  const cookieTokens = readCookieValues(c.req.header('cookie'), CSRF_COOKIE_NAME);

  return cookieTokens.some(token => secretsEqual(token, headerToken));
}

function readCookieValues(cookieHeader: string | undefined, name: string): string[] {
  if (!cookieHeader) return [];

  const values: string[] = [];
  const prefix = `${name}=`;

  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(prefix)) continue;

    const raw = trimmed.slice(prefix.length);

    try {
      values.push(decodeURIComponent(raw));
    } catch {
      values.push(raw);
    }
  }

  return values;
}
