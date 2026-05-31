import { Hono } from 'hono';

import SiteConfig from '../../config/config';
import { getPostbackProvider, validationFailureToLogFields } from '../../schemas/postback';
import { logPendingPostback, updatePostbackLog } from '../../utils/postback';
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
        const provider = getPostbackProvider(routeProvider);

        if (!provider) {
          await updatePostbackLog(requestID, {
            status: 'failed',
            failureReason: 'unknown_provider',
            failureDetail: `No provider registered for "${routeProvider}".`,
          });

          return c.json({ success: false, message: 'Unknown provider' }, 404);
        }

        const result = provider.validate({
          query: normalizeQuery(c.req.query()),
          remoteIP: getIPFromRequest(c),
        }, c);

        if (result.ok) {
          await updatePostbackLog(requestID, {
            status: 'completed',
            resolvedProviderId: provider.id,
            normalized: result.normalized,
            ...(SiteConfig.postback.disableSecurityChecks && { securityChecksSkipped: true }),
          });

          return provider.respond(c, true);
        }

        await updatePostbackLog(requestID, {
          status: 'failed',
          resolvedProviderId: provider.id,
          ...validationFailureToLogFields(result),
        });

        return provider.respond(c, false);
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
