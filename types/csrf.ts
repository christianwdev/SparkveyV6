import crypto from 'crypto';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from 'constants/csrf';

import {
  getClearCookieOptions,
  getCsrfCookieOptions,
} from './cookies';

import type { Context } from 'hono';

export {
  CSRF_HEADER_NAME,
  clearCsrfCookie,
  createCsrfToken,
  setCsrfCookie,
  validateCsrf,
};

function createCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

function setCsrfCookie(c: Context, maxAge: number) {
  const csrfToken = createCsrfToken();

  setCookie(c, CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions(maxAge));

  return csrfToken;
}

function clearCsrfCookie(c: Context) {
  deleteCookie(c, CSRF_COOKIE_NAME, getClearCookieOptions());
}

function validateCsrf(c: Context) {
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
