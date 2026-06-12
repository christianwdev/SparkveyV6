import { Hono } from 'hono';

import { withRouteErrorHandling } from 'backend/utils/request';

// Utils
import {
  getUserRedemptionHistory,
} from 'backend/utils/user';

// Types
import type InternalUser from 'types/InternalUser';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.get(
    '/redemptions/history',
    withRouteErrorHandling,
    async (c) => {
      const user = c.get('user');

      return c.json({ success: true, data: [] });
    }
  );

  return app;
}
