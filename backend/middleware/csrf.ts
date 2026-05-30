import { sendResponse } from '../utils/response';
import { validateCsrf } from '../utils/csrf';

import type { Context, Next } from 'hono';

export async function requireCsrf(c: Context, next: Next) {
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
