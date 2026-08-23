import crypto from 'crypto';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

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
  const cookieToken = getCookie(c, CSRF_COOKIE_NAME);
  const headerToken = c.req.header(CSRF_HEADER_NAME);

  return secretsEqual(cookieToken, headerToken);
}
