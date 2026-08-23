import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

// Middleware
import { requireAdmin } from 'backend/middleware/auth';
import { requireCsrf } from 'backend/middleware/csrf';
import { getIPFromRequest, withRouteErrorHandling } from 'backend/utils/request';
import { rateLimit } from 'backend/utils/rateLimit';

// Schemas
import {
  adminEarningsQuerySchema,
  adminEarningsReleaseBodySchema,
} from 'backend/schemas/admin/earnings';

// Utils
import { sendResponse } from 'backend/utils/response';
import {
  listAdminEarnings,
  releaseAdminHeldEarning,
} from 'backend/utils/admin/earnings';

// Types
import type InternalUser from 'types/User/InternalUser';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

const app = new Hono<{ Variables: { user: InternalUser } }>();

const VIEW_AND_MODIFY_EARNINGS = StaffPermissions.VIEW_EARNINGS | StaffPermissions.MODIFY_EARNINGS;

const adminEarningsMutationRateLimit = rateLimit({
  keyPrefix: 'admin-earnings',
  maxRequests: 30,
  windowSeconds: 60,
  keyGenerator: (c) => {
    const actor = c.get('user');

    return actor?.userID ?? getIPFromRequest(c);
  },
});

export default function routesInvoker() {
  app.get(
    '/',
    withRouteErrorHandling,
    zValidator('query', adminEarningsQuerySchema),
    requireAdmin(StaffPermissions.VIEW_EARNINGS),
    async (c) => {
      const { limit, offset, status, searchBy, search } = c.req.valid('query');
      const result = await listAdminEarnings({
        statuses: status,
        searchBy,
        search,
        limit,
        offset,
      });

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to load earnings',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.post(
    '/release',
    adminEarningsMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', adminEarningsReleaseBodySchema),
    requireAdmin(VIEW_AND_MODIFY_EARNINGS),
    async (c) => {
      const { provider, conversionID } = c.req.valid('json');
      const result = await releaseAdminHeldEarning({
        provider,
        conversionID,
      });

      if (!result.ok && result.error === 'notFound') {
        return sendResponse({
          c,
          status: 404,
          success: false,
          code: result.error,
          message: 'Held earning not found or already processed',
        });
      }

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to release earning',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  return app;
}
