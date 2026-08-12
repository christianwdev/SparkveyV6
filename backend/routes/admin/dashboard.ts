import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

// Middleware
import { requireAdmin } from 'backend/middleware/auth';
import { withRouteErrorHandling } from 'backend/utils/request';

// Utils
import { getAdminDashboardStatistics } from 'backend/utils/admin/statistics';
import { sendResponse } from 'backend/utils/response';

// Types
import type InternalUser from 'types/User/InternalUser';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

const app = new Hono<{ Variables: { user: InternalUser } }>();

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const dashboardQuerySchema = z.object({
  period: z.enum([ 'day', 'week', 'month', 'custom' ]).optional().default('week'),
  start: dateOnlySchema.optional(),
  end: dateOnlySchema.optional(),
}).superRefine((value, ctx) => {
  if (value.period !== 'custom') return;

  if (!value.start || !value.end) {
    ctx.addIssue({
      code: 'custom',
      message: 'Custom period requires start and end (YYYY-MM-DD)',
      path: [ 'start' ],
    });
  }
});

export default function routesInvoker() {
  app.get(
    '/',
    withRouteErrorHandling,
    zValidator('query', dashboardQuerySchema),
    requireAdmin(StaffPermissions.VIEW_STATISTICS),
    async (c) => {
      const { period, start, end } = c.req.valid('query');
      const result = await getAdminDashboardStatistics({ period, start, end });

      if (!result.ok) return c.json({ success: false, error: result.error });

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
