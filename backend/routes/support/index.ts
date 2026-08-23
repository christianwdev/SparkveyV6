import { Hono } from 'hono';

// Middleware
import { requireAuth } from 'backend/middleware/auth';
import { withRouteErrorHandling } from 'backend/utils/request';

// Utils
import { sendResponse } from 'backend/utils/response';
import { getUserSupportConversation } from 'backend/utils/supportChat';

// Types
import type InternalUser from 'types/User/InternalUser';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.get('/conversation', requireAuth, withRouteErrorHandling, async (c) => {
    const user = c.get('user');
    const result = await getUserSupportConversation({ userID: user.userID });

    if (!result.ok) {
      return sendResponse({
        c,
        status: 500,
        success: false,
        code: result.error,
        message: 'Failed to load conversation',
      });
    }

    return c.json({
      success: true,
      data: result.data,
    }, 200);
  });

  return app;
}
