import config from '../config/config';

import { CSRF_COOKIE_NAME } from 'constants/csrf';

export const SESSION_COOKIE_NAME = 'sessionID';

export { CSRF_COOKIE_NAME };

export function getSessionCookieOptions(maxAge: number) {
  return {
    maxAge,
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax' as const,
    domain: config.server.cookieDomain,
  };
}

export function getCsrfCookieOptions(maxAge: number) {
  return {
    maxAge,
    path: '/',
    httpOnly: false,
    secure: true,
    sameSite: 'Lax' as const,
    domain: config.server.cookieDomain,
  };
}

export function getClearCookieOptions() {
  return {
    path: '/',
    secure: true,
    sameSite: 'Lax' as const,
    domain: config.server.cookieDomain,
  };
}
