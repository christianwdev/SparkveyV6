import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

// Middleware
import { requireAuth } from 'backend/middleware/auth';
import { requireCsrf } from 'backend/middleware/csrf';
import { getIPFromRequest, withRouteErrorHandling } from 'backend/utils/request';
import { rateLimit } from 'backend/utils/rateLimit';

// Utils
import { sendResponse } from 'backend/utils/response';
import { claimPromocode } from 'backend/utils/promocodes';

// Types
import type InternalUser from 'types/User/InternalUser';

const app = new Hono<{ Variables: { user: InternalUser } }>();

const claimRateLimit = rateLimit({
  keyPrefix: 'promocode-claim',
  maxRequests: 10,
  windowSeconds: 60,
  keyGenerator: (c) => {
    const actor = c.get('user');

    return actor?.userID ?? getIPFromRequest(c);
  },
});

const claimBodySchema = z.object({
  code: z.string().trim().min(3).max(32),
});

export default function routesInvoker() {
  app.post(
    '/claim',
    requireAuth,
    claimRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', claimBodySchema),
    async (c) => {
      const user = c.get('user');
      const { code } = c.req.valid('json');
      const result = await claimPromocode({
        userID: user.userID,
        code,
      });

      if (!result.ok) {
        const status = result.error === 'internalServerError' ? 500 : 400;

        return sendResponse({
          c,
          status,
          success: false,
          code: result.error,
          message: result.error,
        });
      }

      return sendResponse({
        c,
        status: 200,
        success: true,
        data: result.data,
      });
    },
  );

  return app;
}
