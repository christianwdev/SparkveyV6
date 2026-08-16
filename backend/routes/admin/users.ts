import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

// Middleware
import { requireAdmin } from 'backend/middleware/auth';
import { requireCsrf } from 'backend/middleware/csrf';
import { getIPFromRequest, withRouteErrorHandling } from 'backend/utils/request';
import { rateLimit } from 'backend/utils/rateLimit';

// Schemas
import {
  adminAdjustBalanceBodySchema,
  adminBanUserBodySchema,
  adminListUsersQuerySchema,
  adminPaginationQuerySchema,
  adminUpdateUserBodySchema,
  adminUserEarningsQuerySchema,
  adminUserEmailsQuerySchema,
  adminUserRedemptionsQuerySchema,
  adminUserSessionsQuerySchema,
} from 'backend/schemas/admin/users';

// Utils
import {
  adjustAdminUserBalance,
  getUsers,
  getUser,
  getUserSessions,
  getUserTransactions,
  getUserEmailActionables,
  getUserAffiliateData,
  PERMANENT_BAN_UNTIL,
  revokeAdminUserSession,
  revokeAllAdminUserSessions,
  setAdminUserBan,
  updateAdminUser,
} from 'backend/utils/admin/user';
import {
  getUserEarningsHistory,
  getUserRedemptionHistory,
} from 'backend/utils/user';
import { sendResponse } from 'backend/utils/response';

// Types
import type { Context } from 'hono';
import type InternalUser from 'types/User/InternalUser';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

const app = new Hono<{ Variables: { user: InternalUser } }>();

const VIEW_AND_MODIFY_USERS = StaffPermissions.VIEW_USERS | StaffPermissions.MODIFY_USERS;

const adminUserMutationRateLimit = rateLimit({
  keyPrefix: 'admin-users',
  maxRequests: 30,
  windowSeconds: 60,
  keyGenerator: (c) => {
    const actor = c.get('user');

    return actor?.userID ?? getIPFromRequest(c);
  },
});

function sendAdminUserError(
  c: Context,
  error: string,
) {
  if (error === 'notFound') {
    return sendResponse({ c, status: 404, success: false, code: error, message: 'User not found' });
  }
  if (error === 'emailInUse') {
    return sendResponse({ c, status: 409, success: false, code: error, message: 'Email is already in use' });
  }
  if (error === 'forbidden') {
    return sendResponse({ c, status: 403, success: false, code: error, message: 'You cannot modify this user' });
  }
  if (error === 'deleted') {
    return sendResponse({ c, status: 409, success: false, code: error, message: 'This account is deleted' });
  }
  if (error === 'selfBan') {
    return sendResponse({ c, status: 400, success: false, code: error, message: 'You cannot ban your own account' });
  }
  if (error === 'insufficientBalance') {
    return sendResponse({ c, status: 400, success: false, code: error, message: 'Insufficient balance' });
  }

  return sendResponse({
    c,
    status: 500,
    success: false,
    code: 'internalServerError',
    message: 'Internal server error',
  });
}

export default function routesInvoker() {
  app.get(
    '/list',
    withRouteErrorHandling,
    zValidator('query', adminListUsersQuerySchema),
    requireAdmin(StaffPermissions.VIEW_USERS),
    async (c) => {
      const { limit, offset, search, sort, order, filterBy } = c.req.valid('query');

      const users = await getUsers({
        limit,
        offset,
        search,
        sort,
        order,
        filterBy,
      });

      if (!users.ok) return sendAdminUserError(c, users.error);

      return sendResponse({ c, status: 200, success: true, data: users.data });
    },
  );

  app.get('/:userID', withRouteErrorHandling, requireAdmin(StaffPermissions.VIEW_USERS), async (c) => {
    const { userID } = c.req.param();

    const user = await getUser({ userID });

    if (!user.ok) return sendAdminUserError(c, user.error);

    return sendResponse({ c, status: 200, success: true, data: user.data });
  });

  app.patch(
    '/:userID',
    adminUserMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', adminUpdateUserBodySchema),
    requireAdmin(VIEW_AND_MODIFY_USERS),
    async (c) => {
      const actor = c.get('user');
      const { userID } = c.req.param();
      const body = c.req.valid('json');

      const result = await updateAdminUser({
        actor,
        userID,
        username: body.username,
        email: body.email,
        emailVerified: body.emailVerified,
        userConfiguration: body.userConfiguration,
      });

      if (!result.ok) return sendAdminUserError(c, result.error);

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.post(
    '/:userID/balance',
    adminUserMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', adminAdjustBalanceBodySchema),
    requireAdmin(VIEW_AND_MODIFY_USERS),
    async (c) => {
      const actor = c.get('user');
      const { userID } = c.req.param();
      const { amount } = c.req.valid('json');

      const result = await adjustAdminUserBalance({
        actor,
        userID,
        amount,
      });

      if (!result.ok) return sendAdminUserError(c, result.error);

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.post(
    '/:userID/ban',
    adminUserMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', adminBanUserBodySchema),
    requireAdmin(VIEW_AND_MODIFY_USERS),
    async (c) => {
      const actor = c.get('user');
      const { userID } = c.req.param();
      const { until } = c.req.valid('json');

      const bannedUntil = until ? new Date(until) : PERMANENT_BAN_UNTIL;
      const result = await setAdminUserBan({
        actor,
        userID,
        bannedUntil,
      });

      if (!result.ok) return sendAdminUserError(c, result.error);

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.delete(
    '/:userID/ban',
    adminUserMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    requireAdmin(VIEW_AND_MODIFY_USERS),
    async (c) => {
      const actor = c.get('user');
      const { userID } = c.req.param();

      const result = await setAdminUserBan({
        actor,
        userID,
        bannedUntil: null,
      });

      if (!result.ok) return sendAdminUserError(c, result.error);

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.get(
    '/:userID/sessions',
    withRouteErrorHandling,
    zValidator('query', adminUserSessionsQuerySchema),
    requireAdmin(StaffPermissions.VIEW_USERS),
    async (c) => {
      const { userID } = c.req.param();
      const { limit, offset, activeOnly } = c.req.valid('query');

      const sessions = await getUserSessions({ userID, limit, offset, activeOnly });

      if (!sessions.ok) return sendAdminUserError(c, sessions.error);

      return sendResponse({ c, status: 200, success: true, data: sessions.data });
    },
  );

  app.delete(
    '/:userID/sessions/:sessionID',
    adminUserMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    requireAdmin(VIEW_AND_MODIFY_USERS),
    async (c) => {
      const actor = c.get('user');
      const { userID, sessionID } = c.req.param();

      const result = await revokeAdminUserSession({
        actor,
        userID,
        sessionID,
      });

      if (!result.ok) return sendAdminUserError(c, result.error);

      return sendResponse({ c, status: 200, success: true });
    },
  );

  app.post(
    '/:userID/sessions/revoke-all',
    adminUserMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    requireAdmin(VIEW_AND_MODIFY_USERS),
    async (c) => {
      const actor = c.get('user');
      const { userID } = c.req.param();

      const result = await revokeAllAdminUserSessions({
        actor,
        userID,
      });

      if (!result.ok) return sendAdminUserError(c, result.error);

      return sendResponse({ c, status: 200, success: true });
    },
  );

  app.get(
    '/:userID/transactions',
    withRouteErrorHandling,
    zValidator('query', adminPaginationQuerySchema),
    requireAdmin(StaffPermissions.VIEW_USERS),
    async (c) => {
      const { userID } = c.req.param();
      const { limit, offset } = c.req.valid('query');

      const transactions = await getUserTransactions({ userID, limit, offset });

      if (!transactions.ok) return sendAdminUserError(c, transactions.error);

      return sendResponse({ c, status: 200, success: true, data: transactions.data });
    },
  );

  app.get(
    '/:userID/earnings',
    withRouteErrorHandling,
    zValidator('query', adminUserEarningsQuerySchema),
    requireAdmin(StaffPermissions.VIEW_USERS | StaffPermissions.VIEW_EARNINGS),
    async (c) => {
      const { userID } = c.req.param();
      const { limit, offset, status, type } = c.req.valid('query');

      const earnings = await getUserEarningsHistory({ userID, limit, offset, status, type });

      if (!earnings.ok) return sendAdminUserError(c, earnings.error);

      return sendResponse({ c, status: 200, success: true, data: earnings.data });
    },
  );

  app.get(
    '/:userID/redemptions',
    withRouteErrorHandling,
    zValidator('query', adminUserRedemptionsQuerySchema),
    requireAdmin(StaffPermissions.VIEW_USERS | StaffPermissions.VIEW_WITHDRAWALS),
    async (c) => {
      const { userID } = c.req.param();
      const { limit, offset, status, type } = c.req.valid('query');

      const redemptions = await getUserRedemptionHistory({ userID, limit, offset, status, type });

      if (!redemptions.ok) return sendAdminUserError(c, redemptions.error);

      return sendResponse({ c, status: 200, success: true, data: redemptions.data });
    },
  );

  app.get(
    '/:userID/affiliates',
    withRouteErrorHandling,
    zValidator('query', adminPaginationQuerySchema),
    requireAdmin(StaffPermissions.VIEW_USERS),
    async (c) => {
      const { userID } = c.req.param();
      const { limit, offset } = c.req.valid('query');

      const affiliates = await getUserAffiliateData({
        userID,
        referredLimit: limit,
        referredOffset: offset,
      });

      if (!affiliates.ok) return sendAdminUserError(c, affiliates.error);

      return sendResponse({ c, status: 200, success: true, data: affiliates.data });
    },
  );

  app.get(
    '/:userID/emails',
    withRouteErrorHandling,
    zValidator('query', adminUserEmailsQuerySchema),
    requireAdmin(StaffPermissions.VIEW_USERS),
    async (c) => {
      const { userID } = c.req.param();
      const { limit, offset, type } = c.req.valid('query');

      const emails = await getUserEmailActionables({ userID, limit, offset, type });

      if (!emails.ok) return sendAdminUserError(c, emails.error);

      return sendResponse({ c, status: 200, success: true, data: emails.data });
    },
  );

  return app;
}
