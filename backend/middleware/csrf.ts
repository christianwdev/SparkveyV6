import { sendResponse } from '../utils/response';
import { validateCsrf } from '../utils/csrf';
import { isTrustedNextPassthrough } from '../utils/request';

import type { Context, Next } from 'hono';

export async function requireCsrf(c: Context, next: Next) {
  // Next SSR already holds the session cookie and a shared secret; it cannot
  // read the non-HttpOnly csrfToken from the incoming document.
  if (isTrustedNextPassthrough(c)) {
    await next();

    return;
  }

  if (!validateCsrf(c)) {
    return sendResponse({
      c,
      status: 403,
      success: false,
      message: 'Invalid or missing CSRF token',
    });
  }

  await next();
}
