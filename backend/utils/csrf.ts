import crypto from 'crypto';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

export const CSRF_HEADER_NAME = 'x-csrf-token';
export const CSRF_COOKIE_NAME = 'csrfToken';

import {
  getCsrfCookieOptions,
  getClearCookieOptions,
} from './cookies';
import type { Context } from 'hono';

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

  if (!cookieToken || !headerToken) {
    return false;
  }

  const cookieBuffer = new TextEncoder().encode(cookieToken);
  const headerBuffer = new TextEncoder().encode(headerToken);

  if (cookieBuffer.length !== headerBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(cookieBuffer, headerBuffer);
}
