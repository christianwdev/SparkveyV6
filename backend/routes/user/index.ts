import { Hono } from 'hono';

// Middleware
import { withRouteErrorHandling } from 'backend/utils/request';
import { requireAuth } from 'backend/middleware/auth';

// Utils
import { sendResponse } from 'backend/utils/response';
import { sanitizeUser } from 'backend/utils/user';

// Types
import type InternalUser from 'types/User/InternalUser';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.get('/get', requireAuth, withRouteErrorHandling, async (c) => {
    return sendResponse({
      c,
      status: 200,
      success: true,
      data: sanitizeUser(c.get('user')),
    });
  });

  return app;
}