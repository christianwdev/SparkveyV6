import { Hono } from 'hono';

// Middleware
import { withRouteErrorHandling } from 'backend/utils/request';
import { requireAuth } from 'backend/middleware/auth';

// Utils
import { sendResponse } from 'backend/utils/response';

// Types
import type InternalUser from 'types/InternalUser';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.get('/get', requireAuth, withRouteErrorHandling, async (c) => {
    return sendResponse({ c, status: 200, success: true, data: c.get('user') });
  });

  return app;
}