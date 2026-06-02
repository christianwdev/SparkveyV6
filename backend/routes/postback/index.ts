import { Hono } from 'hono';

import {
  fulfillPostback,
  logPendingPostback,
  processPostback,
  updatePostbackLog,
} from '../../utils/postback';
import { getIPFromRequest, normalizeQuery, withRouteErrorHandling } from '../../utils/request';

const app = new Hono<{ Variables: { requestID: string } }>();

export default function routesInvoker() {
  app.use(
    '/:provider',
    withRouteErrorHandling,
    async (c, next) => {
      if (c.req.method !== 'GET') {
        return c.json({ success: false, message: 'Method not allowed' }, 405);
      }

      await logPendingPostback(c);

      return next();
    },
  );

  app.get(
    '/:provider',
    withRouteErrorHandling,
    async (c) => {
      const requestID = c.get('requestID');
      const routeProvider = c.req.param('provider');

      try {
        const { provider, ok, logUpdate } = processPostback({
          routeProvider,
          query: normalizeQuery(c.req.query()),
          remoteIP: getIPFromRequest(c),
          context: c,
        });

        if (!provider) {
          await updatePostbackLog(requestID, logUpdate);

          return c.json({ success: false, message: 'Unknown provider' }, 404);
        }

        if (!ok) {
          await updatePostbackLog(requestID, logUpdate);

          return provider.respond(c, false);
        }

        const { respondOk, logUpdate: fulfilledLogUpdate } = await fulfillPostback(
          requestID,
          logUpdate,
        );

        await updatePostbackLog(
          requestID,
          fulfilledLogUpdate,
          respondOk ? { unsetFailureFields: true } : undefined,
        );

        return provider.respond(c, respondOk);
      } catch (err) {
        await updatePostbackLog(requestID, {
          status: 'failed',
          failureReason: 'internal_error',
          failureDetail: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
  );

  return app;
}
