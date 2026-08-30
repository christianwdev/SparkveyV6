import { Hono } from 'hono';

// Middleware
import { withRouteErrorHandling } from 'backend/utils/request';

// Utils
import { sendResponse } from 'backend/utils/response';
import { getReadiness } from 'backend/utils/health';

const app = new Hono();

export default function routesInvoker() {
  // Process is up. Used as a liveness probe so a drain does not get SIGKILL.
  app.get('/live', withRouteErrorHandling, (c) => {
    return sendResponse({ c, status: 200, success: true });
  });

  app.get('/ready', withRouteErrorHandling, async (c) => {
    const { ready, checks } = await getReadiness();

    return sendResponse({
      c,
      status: ready ? 200 : 503,
      success: ready,
      data: checks,
    });
  });

  // Alias of /live for platforms that only hit /health.
  app.get('/', withRouteErrorHandling, (c) => {
    return sendResponse({ c, status: 200, success: true });
  });

  return app;
}
