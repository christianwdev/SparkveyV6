import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

// Middleware
import { requireAdmin } from 'backend/middleware/auth';
import { requireCsrf } from 'backend/middleware/csrf';
import { getIPFromRequest, withRouteErrorHandling } from 'backend/utils/request';
import { rateLimit } from 'backend/utils/rateLimit';

// Schemas
import {
  adminWithdrawalsAcceptBodySchema,
  adminWithdrawalsQuerySchema,
  adminWithdrawalsRejectBodySchema,
} from 'backend/schemas/admin/withdrawals';

// Utils
import { sendResponse } from 'backend/utils/response';
import {
  acceptAdminWithdrawals,
  listAdminWithdrawals,
  rejectAdminWithdrawals,
} from 'backend/utils/admin/withdrawals';

// Types
import type InternalUser from 'types/User/InternalUser';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

const app = new Hono<{ Variables: { user: InternalUser } }>();

const VIEW_AND_MODIFY_WITHDRAWALS = StaffPermissions.VIEW_WITHDRAWALS | StaffPermissions.MODIFY_WITHDRAWALS;

const adminWithdrawalMutationRateLimit = rateLimit({
  keyPrefix: 'admin-withdrawals',
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
    zValidator('query', adminWithdrawalsQuerySchema),
    requireAdmin(StaffPermissions.VIEW_WITHDRAWALS),
    async (c) => {
      const { limit, offset, status, provider } = c.req.valid('query');
      const result = await listAdminWithdrawals({
        statuses: status,
        providers: provider,
        limit,
        offset,
      });

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to load withdrawals',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.post(
    '/accept',
    adminWithdrawalMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', adminWithdrawalsAcceptBodySchema),
    requireAdmin(VIEW_AND_MODIFY_WITHDRAWALS),
    async (c) => {
      const actor = c.get('user');
      const { redemptionIDs, attestation } = c.req.valid('json');
      const result = await acceptAdminWithdrawals({
        actor,
        redemptionIDs,
        reason: attestation?.reason,
      });

      if (!result.ok && result.error === 'attestationRequired') {
        return sendResponse({
          c,
          status: 409,
          success: false,
          code: result.error,
          message: 'Attestation is required to accept flagged withdrawals',
          data: result.data,
        });
      }

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to accept withdrawals',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.post(
    '/reject',
    adminWithdrawalMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', adminWithdrawalsRejectBodySchema),
    requireAdmin(VIEW_AND_MODIFY_WITHDRAWALS),
    async (c) => {
      const actor = c.get('user');
      const { redemptionIDs, reason } = c.req.valid('json');
      const result = await rejectAdminWithdrawals({
        actor,
        redemptionIDs,
        reason,
      });

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to reject withdrawals',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  return app;
}
