import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

// Middleware
import { requireAdmin } from 'backend/middleware/auth';
import { requireCsrf } from 'backend/middleware/csrf';
import { getIPFromRequest, withRouteErrorHandling } from 'backend/utils/request';
import { rateLimit } from 'backend/utils/rateLimit';

// Schemas
import {
  adminRedemptionMethodParamsSchema,
  adminRedemptionMethodUpdateBodySchema,
  adminRedemptionMethodsQuerySchema,
} from 'backend/schemas/admin/redemptionMethods';

// Utils
import { sendResponse } from 'backend/utils/response';
import {
  getAdminRedemptionMethod,
  listAdminRedemptionMethods,
  updateAdminRedemptionMethod,
} from 'backend/utils/admin/redemptionMethods';

// Types
import type { Context } from 'hono';
import type InternalUser from 'types/User/InternalUser';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

const app = new Hono<{ Variables: { user: InternalUser } }>();

const VIEW_AND_MODIFY_OFFERS = StaffPermissions.VIEW_OFFERS | StaffPermissions.MODIFY_OFFERS;

const adminRedemptionMethodsMutationRateLimit = rateLimit({
  keyPrefix: 'admin-redemption-methods',
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
    zValidator('query', adminRedemptionMethodsQuerySchema),
    requireAdmin(StaffPermissions.VIEW_OFFERS),
    async (c) => {
      const { limit, offset, status, searchBy, search, sortDirection } = c.req.valid('query');
      const result = await listAdminRedemptionMethods({
        status,
        searchBy,
        search,
        sortDirection,
        limit,
        offset,
      });

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to load redemption methods',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.post(
    '/update',
    adminRedemptionMethodsMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', adminRedemptionMethodUpdateBodySchema),
    requireAdmin(VIEW_AND_MODIFY_OFFERS),
    async (c) => {
      const body = c.req.valid('json');
      const result = await updateAdminRedemptionMethod(body);

      if (!result.ok) return sendAdminRedemptionMethodError(c, result.error);

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.get(
    '/:rewardID',
    withRouteErrorHandling,
    zValidator('param', adminRedemptionMethodParamsSchema),
    requireAdmin(StaffPermissions.VIEW_OFFERS),
    async (c) => {
      const { rewardID } = c.req.valid('param');
      const result = await getAdminRedemptionMethod({ rewardID });

      if (!result.ok) return sendAdminRedemptionMethodError(c, result.error);

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  return app;
}

function sendAdminRedemptionMethodError(c: Context, error: string) {
  if (error === 'notFound') {
    return sendResponse({ c, status: 404, success: false, code: error, message: 'Redemption method not found' });
  }
  if (error === 'invalidImageURL') {
    return sendResponse({ c, status: 400, success: false, code: error, message: 'Internal image URL must be a valid HTTP or HTTPS URL' });
  }

  return sendResponse({
    c,
    status: 500,
    success: false,
    code: error,
    message: 'Failed to save redemption method',
  });
}
