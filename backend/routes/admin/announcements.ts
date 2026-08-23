import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

// Middleware
import { requireAdmin } from 'backend/middleware/auth';
import { requireCsrf } from 'backend/middleware/csrf';
import { getIPFromRequest, withRouteErrorHandling } from 'backend/utils/request';
import { rateLimit } from 'backend/utils/rateLimit';

// Schemas
import { adminAnnouncementCreateBodySchema } from 'backend/schemas/admin/announcements';

// Utils
import { sendResponse } from 'backend/utils/response';
import {
  disableAnnouncement,
  listAnnouncement,
  upsertAnnouncement,
} from 'backend/utils/announcement';

// Types
import type InternalUser from 'types/User/InternalUser';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

const app = new Hono<{ Variables: { user: InternalUser } }>();

const VIEW_AND_MODIFY_ANNOUNCEMENTS = StaffPermissions.VIEW_ANNOUNCEMENTS | StaffPermissions.MODIFY_ANNOUNCEMENTS;

const adminAnnouncementMutationRateLimit = rateLimit({
  keyPrefix: 'admin-announcements',
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
    requireAdmin(StaffPermissions.VIEW_ANNOUNCEMENTS),
    async (c) => {
      const result = await listAnnouncement();

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to load announcements',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.post(
    '/',
    adminAnnouncementMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', adminAnnouncementCreateBodySchema),
    requireAdmin(VIEW_AND_MODIFY_ANNOUNCEMENTS),
    async (c) => {
      const { message } = c.req.valid('json');
      const result = await upsertAnnouncement({ message });

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to create announcement',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.post(
    '/disable',
    adminAnnouncementMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    requireAdmin(VIEW_AND_MODIFY_ANNOUNCEMENTS),
    async (c) => {
      const result = await disableAnnouncement();

      if (!result.ok && result.error === 'notFound') {
        return sendResponse({
          c,
          status: 404,
          success: false,
          code: result.error,
          message: 'Announcement not found',
        });
      }

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to disable announcement',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  return app;
}
