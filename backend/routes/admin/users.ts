import { Hono } from 'hono';

// Middleware
import { requireAdmin } from 'backend/middleware/auth';
import { withRouteErrorHandling } from 'backend/utils/request';

// Schemas
import {
  adminPaginationQuerySchema,
  adminUserEarningsQuerySchema,
  adminUserEmailsQuerySchema,
  adminUserRedemptionsQuerySchema,
  adminUserSessionsQuerySchema,
} from 'backend/schemas/admin/users';

// Utils
import {
  getUsers,
  getUser,
  getUserSessions,
  getUserTransactions,
  getUserEmailActionables,
  getUserAffiliateData,
} from 'backend/utils/admin/user';
import {
  getUserEarningsHistory,
  getUserRedemptionHistory,
} from 'backend/utils/user';
import { sendResponse } from 'backend/utils/response';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

// Types
import type InternalUser from 'types/InternalUser';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {

  const listUsersQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    offset: z.coerce.number().int().min(0).optional().default(0),
    search: z.string().optional(),
    sort: z.enum([ 'createdAt', 'balance.sparks' ]).optional().default('createdAt'),
    order: z.enum([ 'asc', 'desc' ]).optional().default('desc'),
    filterBy: z.enum([ 'username', 'email', 'userID' ]).optional().default('username'),
  });

  app.get('/list', withRouteErrorHandling, zValidator('query', listUsersQuerySchema), requireAdmin(StaffPermissions.VIEW_USERS), async (c) => {
    const { limit, offset, search, sort, order, filterBy } = c.req.valid('query');

    const users = await getUsers({
      limit,
      offset,
      search,
      sort,
      order,
      filterBy,
    });

    if (!users.ok) return c.json({ success: false, error: users.error });

    return sendResponse({ c, status: 200, success: true, data: users.data });
  });

  app.get('/:userID', withRouteErrorHandling, requireAdmin(StaffPermissions.VIEW_USERS), async (c) => {
    const { userID } = c.req.param();

    const user = await getUser({ userID });

    if (!user.ok) return c.json({ success: false, error: user.error });

    return sendResponse({ c, status: 200, success: true, data: user.data });
  });

  app.get('/:userID/sessions', withRouteErrorHandling, zValidator('query', adminUserSessionsQuerySchema), requireAdmin(StaffPermissions.VIEW_USERS), async (c) => {
    const { userID } = c.req.param();
    const { limit, offset, activeOnly } = c.req.valid('query');

    const sessions = await getUserSessions({ userID, limit, offset, activeOnly });

    if (!sessions.ok) return c.json({ success: false, error: sessions.error });

    return sendResponse({ c, status: 200, success: true, data: sessions.data });
  });

  app.get('/:userID/transactions', withRouteErrorHandling, zValidator('query', adminPaginationQuerySchema), requireAdmin(StaffPermissions.VIEW_USERS), async (c) => {
    const { userID } = c.req.param();
    const { limit, offset } = c.req.valid('query');

    const transactions = await getUserTransactions({ userID, limit, offset });

    if (!transactions.ok) return c.json({ success: false, error: transactions.error });

    return sendResponse({ c, status: 200, success: true, data: transactions.data });
  });

  app.get('/:userID/earnings', withRouteErrorHandling, zValidator('query', adminUserEarningsQuerySchema), requireAdmin(StaffPermissions.VIEW_USERS | StaffPermissions.VIEW_EARNINGS), async (c) => {
    const { userID } = c.req.param();
    const { limit, offset, status, type } = c.req.valid('query');

    const earnings = await getUserEarningsHistory({ userID, limit, offset, status, type });

    if (!earnings.ok) return c.json({ success: false, error: earnings.error });

    return sendResponse({ c, status: 200, success: true, data: earnings.data });
  });

  app.get('/:userID/redemptions', withRouteErrorHandling, zValidator('query', adminUserRedemptionsQuerySchema), requireAdmin(StaffPermissions.VIEW_USERS | StaffPermissions.VIEW_WITHDRAWALS), async (c) => {
    const { userID } = c.req.param();
    const { limit, offset, status, type } = c.req.valid('query');

    const redemptions = await getUserRedemptionHistory({ userID, limit, offset, status, type });

    if (!redemptions.ok) return c.json({ success: false, error: redemptions.error });

    return sendResponse({ c, status: 200, success: true, data: redemptions.data });
  });

  app.get('/:userID/affiliates', withRouteErrorHandling, zValidator('query', adminPaginationQuerySchema), requireAdmin(StaffPermissions.VIEW_USERS), async (c) => {
    const { userID } = c.req.param();
    const { limit, offset } = c.req.valid('query');

    const affiliates = await getUserAffiliateData({
      userID,
      referredLimit: limit,
      referredOffset: offset,
    });

    if (!affiliates.ok) return c.json({ success: false, error: affiliates.error });

    return sendResponse({ c, status: 200, success: true, data: affiliates.data });
  });

  app.get('/:userID/emails', withRouteErrorHandling, zValidator('query', adminUserEmailsQuerySchema), requireAdmin(StaffPermissions.VIEW_USERS), async (c) => {
    const { userID } = c.req.param();
    const { limit, offset, type } = c.req.valid('query');

    const emails = await getUserEmailActionables({ userID, limit, offset, type });

    if (!emails.ok) return c.json({ success: false, error: emails.error });

    return sendResponse({ c, status: 200, success: true, data: emails.data });
  });

  return app;
}
