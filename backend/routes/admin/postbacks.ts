import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

// Middleware
import { requireAdmin } from 'backend/middleware/auth';
import { requireCsrf } from 'backend/middleware/csrf';
import { getIPFromRequest, withRouteErrorHandling } from 'backend/utils/request';
import { rateLimit } from 'backend/utils/rateLimit';

// Schemas
import {
  adminPostbacksQuerySchema,
  adminPostbacksRetryBodySchema,
} from 'backend/schemas/admin/postbacks';

// Utils
import { sendResponse } from 'backend/utils/response';
import { listAdminPostbacks } from 'backend/utils/admin/postbacks';
import { retryPostbackLog } from 'backend/utils/postback';

// Types
import type InternalUser from 'types/User/InternalUser';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

const app = new Hono<{ Variables: { user: InternalUser } }>();

const VIEW_AND_MODIFY_POSTBACKS = StaffPermissions.VIEW_POSTBACKS | StaffPermissions.MODIFY_POSTBACKS;

const adminPostbacksMutationRateLimit = rateLimit({
  keyPrefix: 'admin-postbacks',
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
    zValidator('query', adminPostbacksQuerySchema),
    requireAdmin(StaffPermissions.VIEW_POSTBACKS),
    async (c) => {
      const { limit, offset, status, searchBy, search } = c.req.valid('query');
      const result = await listAdminPostbacks({
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
          message: 'Failed to load postbacks',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.post(
    '/retry',
    adminPostbacksMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', adminPostbacksRetryBodySchema),
    requireAdmin(VIEW_AND_MODIFY_POSTBACKS),
    async (c) => {
      const { requestID } = c.req.valid('json');
      const result = await retryPostbackLog(requestID);

      if (!result.ok && result.error === 'notFound') {
        return sendResponse({
          c,
          status: 404,
          success: false,
          code: result.error,
          message: 'Postback not found',
        });
      }

      if (!result.ok && result.error === 'alreadyCompleted') {
        return sendResponse({
          c,
          status: 400,
          success: false,
          code: result.error,
          message: 'Postback already completed',
        });
      }

      if (!result.ok && result.error === 'notFailed') {
        return sendResponse({
          c,
          status: 400,
          success: false,
          code: result.error,
          message: 'Only failed postbacks can be retried',
        });
      }

      if (!result.ok && (result.error === 'validationFailed' || result.error === 'processingFailed')) {
        return sendResponse({
          c,
          status: 400,
          success: false,
          code: result.error,
          message: 'Failed to retry postback',
        });
      }

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to retry postback',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  return app;
}
