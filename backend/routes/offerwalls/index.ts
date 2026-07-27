import { Hono } from 'hono';

// Middleware
import { requireAuth } from 'backend/middleware/auth';

// Utils
import { withRouteErrorHandling } from 'backend/utils/request';
import { sendResponse } from 'backend/utils/response';
import {
  getOfferwallEmbed,
  listCatalogOfferwalls,
} from 'backend/utils/walls';
import RouteResponseError from 'types/RouteResponseError';

// Types
import type InternalUser from 'types/User/InternalUser';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.use(requireAuth);

  app.get('/', withRouteErrorHandling, async (c) => {
    return sendResponse({
      c,
      status: 200,
      success: true,
      data: listCatalogOfferwalls(),
    });
  });

  app.get('/:wallID', withRouteErrorHandling, async (c) => {
    const wallID = c.req.param('wallID').toLowerCase();
    const user = c.get('user');

    const result = getOfferwallEmbed({ wallID, user });

    if (!result.ok) {
      if (result.error === 'notFound') {
        throw new RouteResponseError({ status: 404, message: 'notFound' });
      }

      if (result.error === 'banned') {
        return sendResponse({
          c,
          status: 403,
          success: false,
          code: 'banned',
          message: 'banned',
        });
      }

      if (result.error === 'emailUnverified') {
        return sendResponse({
          c,
          status: 403,
          success: false,
          code: 'emailUnverified',
          message: 'emailUnverified',
        });
      }

      if (result.error === 'earnRequirementNotMet') {
        return sendResponse({
          c,
          status: 403,
          success: false,
          code: 'earnRequirementNotMet',
          message: 'earnRequirementNotMet',
          data: {
            earnRequirement: result.earnRequirement,
            earned: result.earned,
          },
        });
      }

      throw new RouteResponseError({ status: 500, message: 'internalServerError' });
    }

    return sendResponse({
      c,
      status: 200,
      success: true,
      data: result.data,
    });
  });

  return app;
}
