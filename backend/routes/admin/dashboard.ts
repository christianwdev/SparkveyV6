import { Hono } from 'hono';

// Middleware
import { requireAdmin } from 'backend/middleware/auth';
import { withRouteErrorHandling } from 'backend/utils/request';

// Schemas
import { sendResponse } from 'backend/utils/response';

// Types
import type InternalUser from 'types/User/InternalUser';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.get('/', withRouteErrorHandling, requireAdmin(StaffPermissions.VIEW_STATISTICS), async (c) => {
    return sendResponse({ c, status: 200, success: true, data: { message: 'Hello, world!' } });
  });

  return app;
}
