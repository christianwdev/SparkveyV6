import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

// Middleware
import { requireAuth } from 'backend/middleware/auth';
import { requireCsrf } from 'backend/middleware/csrf';

// Utils
import { withRouteErrorHandling } from 'backend/utils/request';
import { sendResponse } from 'backend/utils/response';
import {
  getRecentNotifications,
  markNotificationsRead,
} from 'backend/utils/notifications';
import RouteResponseError from 'types/RouteResponseError';

// Types
import type InternalUser from 'types/User/InternalUser';

const readBodySchema = z.object({
  notificationIDs: z.array(z.string().min(1).max(64)).min(1).max(100).optional(),
});

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.get('/recent', requireAuth, withRouteErrorHandling, async (c) => {
    const user = c.get('user');
    const result = await getRecentNotifications({ userID: user.userID });

    if (!result.ok) throw new RouteResponseError({ status: 500, message: result.error });

    return sendResponse({
      c,
      status: 200,
      success: true,
      data: result.data,
    });
  });

  app.post(
    '/read',
    requireAuth,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', readBodySchema),
    async (c) => {
      const user = c.get('user');
      const { notificationIDs } = c.req.valid('json');

      const result = await markNotificationsRead({
        userID: user.userID,
        notificationIDs,
      });

      if (!result.ok) {
        throw new RouteResponseError({ status: 500, message: result.error });
      }

      return sendResponse({
        c,
        status: 200,
        success: true,
        message: 'Successfully marked your notifications as read',
      });
    },
  );

  return app;
}
