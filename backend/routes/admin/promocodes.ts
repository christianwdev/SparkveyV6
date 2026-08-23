import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

// Middleware
import { requireAdmin } from 'backend/middleware/auth';
import { requireCsrf } from 'backend/middleware/csrf';
import { getIPFromRequest, withRouteErrorHandling } from 'backend/utils/request';
import { rateLimit } from 'backend/utils/rateLimit';

// Utils
import { sendResponse } from 'backend/utils/response';
import {
  createPromocode,
  deletePromocode,
  listPromocodes,
} from 'backend/utils/promocodes';

// Types
import type InternalUser from 'types/User/InternalUser';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

const app = new Hono<{ Variables: { user: InternalUser } }>();

const VIEW_AND_MODIFY_PROMOCODES = StaffPermissions.VIEW_PROMOCODES | StaffPermissions.MODIFY_PROMOCODES;

const adminPromocodeMutationRateLimit = rateLimit({
  keyPrefix: 'admin-promocodes',
  maxRequests: 30,
  windowSeconds: 60,
  keyGenerator: (c) => {
    const actor = c.get('user');

    return actor?.userID ?? getIPFromRequest(c);
  },
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const codeSchema = z.string().trim().min(3).max(32);

const createBodySchema = z.object({
  code: codeSchema,
  rewardValue: z.number().int().positive().max(10000000),
  totalUses: z.number().int().positive().max(1000000),
  expiryDate: z.string().min(1),
});

const deleteBodySchema = z.object({
  code: codeSchema,
});

export default function routesInvoker() {
  app.get(
    '/',
    withRouteErrorHandling,
    zValidator('query', listQuerySchema),
    requireAdmin(StaffPermissions.VIEW_PROMOCODES),
    async (c) => {
      const { limit, offset } = c.req.valid('query');
      const result = await listPromocodes({ limit, offset });

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to load promocodes',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.post(
    '/',
    adminPromocodeMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', createBodySchema),
    requireAdmin(VIEW_AND_MODIFY_PROMOCODES),
    async (c) => {
      const { code, rewardValue, totalUses, expiryDate: rawExpiryDate } = c.req.valid('json');
      const expiryDate = parseExpiryDate(rawExpiryDate);

      if (!expiryDate || expiryDate <= new Date()) {
        return sendResponse({
          c,
          status: 400,
          success: false,
          code: 'invalidExpiry',
          message: 'Expiry date must be in the future',
        });
      }

      const result = await createPromocode({
        code,
        totalUses,
        expiryDate,
        rewardValue,
      });

      if (!result.ok && result.error === 'alreadyExists') {
        return sendResponse({
          c,
          status: 409,
          success: false,
          code: result.error,
          message: 'This promocode already exists',
        });
      }

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to create promocode',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.post(
    '/delete',
    adminPromocodeMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', deleteBodySchema),
    requireAdmin(VIEW_AND_MODIFY_PROMOCODES),
    async (c) => {
      const { code } = c.req.valid('json');
      const result = await deletePromocode({ code });

      if (!result.ok && result.error === 'notFound') {
        return sendResponse({
          c,
          status: 404,
          success: false,
          code: result.error,
          message: 'Promocode not found',
        });
      }

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to delete promocode',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  return app;
}

function parseExpiryDate(value: string): Date | null {
  const trimmed = value.trim();
  const dateOnly = /^(\d{4}-\d{2}-\d{2})$/.exec(trimmed);

  if (dateOnly) {
    const date = new Date(`${dateOnly[1]}T23:59:59.999Z`);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(trimmed);

  return Number.isNaN(date.getTime()) ? null : date;
}
