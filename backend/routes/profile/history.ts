import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

import { withRouteErrorHandling } from 'backend/utils/request';

// Schemas
import {
  earningsHistoryQuerySchema,
  HISTORY_PAGE_SIZE,
  redemptionsHistoryQuerySchema,
} from 'backend/schemas/profile/history';

// Utils
import {
  getUserRedemptionHistory,
  getUserEarningsHistory,
} from 'backend/utils/user';

// Types
import type InternalUser from 'types/InternalUser';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.get(
    '/redemptions/history',
    withRouteErrorHandling,
    zValidator('query', redemptionsHistoryQuerySchema),
    async (c) => {
      const user = c.get('user');
      const { page, status, type } = c.req.valid('query');

      const redemptions = await getUserRedemptionHistory({
        userID: user.userID,
        limit: HISTORY_PAGE_SIZE,
        offset: (page - 1) * HISTORY_PAGE_SIZE,
        status,
        type,
      });

      if (!redemptions.ok) return c.json({ success: false, error: redemptions.error });

      return c.json({ success: true, data: redemptions.data });
    }
  );

  app.get(
    '/earnings/history',
    withRouteErrorHandling,
    zValidator('query', earningsHistoryQuerySchema),
    async (c) => {
      const user = c.get('user');
      const { page, status, type } = c.req.valid('query');

      const earnings = await getUserEarningsHistory({
        userID: user.userID,
        limit: HISTORY_PAGE_SIZE,
        offset: (page - 1) * HISTORY_PAGE_SIZE,
        status,
        type,
      });

      if (!earnings.ok) return c.json({ success: false, error: earnings.error });

      return c.json({ success: true, data: earnings.data });
    }
  );

  return app;
}
