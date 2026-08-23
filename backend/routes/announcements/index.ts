import { Hono } from 'hono';

// Middleware
import { withRouteErrorHandling } from 'backend/utils/request';

// Utils
import { sendResponse } from 'backend/utils/response';
import { getActiveAnnouncement } from 'backend/utils/announcement';

const app = new Hono();

export default function routesInvoker() {
  app.get(
    '/active',
    withRouteErrorHandling,
    async (c) => {
      const result = await getActiveAnnouncement();

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to load announcement',
        });
      }

      if (!result.data) {
        return sendResponse({ c, status: 200, success: true });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  return app;
}
