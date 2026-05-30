import { Hono } from 'hono';

import { sendResponse } from 'backend/utils/response';
import { requireAuth } from 'backend/middleware/auth';
import { setCsrfCookie } from 'backend/utils/csrf';

const app = new Hono();

export default function routesInvoker() {
  app.get('/', requireAuth, async (c) => {
    const session = c.get('session');
    const maxAge = Math.max(0, Math.floor((session.expiryDate.getTime() - Date.now()) / 1000));

    setCsrfCookie(c, maxAge);

    return sendResponse({
      c,
      status: 200,
      success: true,
      message: 'CSRF token issued.',
    });
  });

  return app;
}
