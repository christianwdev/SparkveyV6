import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

// Middleware
import { requireAdmin } from 'backend/middleware/auth';
import { requireCsrf } from 'backend/middleware/csrf';
import { getIPFromRequest, withRouteErrorHandling } from 'backend/utils/request';
import { rateLimit } from 'backend/utils/rateLimit';

// Schemas
import {
  adminOfferCreateBodySchema,
  adminOfferParamsSchema,
  adminOfferUpdateBodySchema,
  adminOffersQuerySchema,
} from 'backend/schemas/admin/offers';

// Utils
import { sendResponse } from 'backend/utils/response';
import {
  createAdminOffer,
  getAdminOffer,
  listAdminOffers,
  updateAdminOffer,
} from 'backend/utils/admin/offers';

// Types
import type { Context } from 'hono';
import type InternalUser from 'types/User/InternalUser';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

const app = new Hono<{ Variables: { user: InternalUser } }>();

const VIEW_AND_MODIFY_OFFERS = StaffPermissions.VIEW_OFFERS | StaffPermissions.MODIFY_OFFERS;

const adminOffersMutationRateLimit = rateLimit({
  keyPrefix: 'admin-offers',
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
    zValidator('query', adminOffersQuerySchema),
    requireAdmin(StaffPermissions.VIEW_OFFERS),
    async (c) => {
      const { limit, offset, status, searchBy, search, sortBy, sortDirection } = c.req.valid('query');
      const result = await listAdminOffers({
        status,
        searchBy,
        search,
        sortBy,
        sortDirection,
        limit,
        offset,
      });

      if (!result.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          code: result.error,
          message: 'Failed to load offers',
        });
      }

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.post(
    '/',
    adminOffersMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', adminOfferCreateBodySchema),
    requireAdmin(VIEW_AND_MODIFY_OFFERS),
    async (c) => {
      const body = c.req.valid('json');
      const result = await createAdminOffer(body);

      if (!result.ok) return sendAdminOfferError(c, result.error);

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.post(
    '/update',
    adminOffersMutationRateLimit,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', adminOfferUpdateBodySchema),
    requireAdmin(VIEW_AND_MODIFY_OFFERS),
    async (c) => {
      const body = c.req.valid('json');
      const result = await updateAdminOffer(body);

      if (!result.ok) return sendAdminOfferError(c, result.error);

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  app.get(
    '/:offerID',
    withRouteErrorHandling,
    zValidator('param', adminOfferParamsSchema),
    requireAdmin(StaffPermissions.VIEW_OFFERS),
    async (c) => {
      const { offerID } = c.req.valid('param');
      const result = await getAdminOffer({ offerID });

      if (!result.ok) return sendAdminOfferError(c, result.error);

      return sendResponse({ c, status: 200, success: true, data: result.data });
    },
  );

  return app;
}

function sendAdminOfferError(c: Context, error: string) {
  if (error === 'notFound') {
    return sendResponse({ c, status: 404, success: false, code: error, message: 'Offer not found' });
  }
  if (error === 'invalidTrackingURL') {
    return sendResponse({ c, status: 400, success: false, code: error, message: 'Tracking URL must be a valid HTTP or HTTPS URL' });
  }
  if (error === 'invalidImageURL') {
    return sendResponse({ c, status: 400, success: false, code: error, message: 'Image URL must be a valid HTTP or HTTPS URL' });
  }
  if (error === 'rewardNotFound') {
    return sendResponse({ c, status: 400, success: false, code: error, message: 'One or more rewards were not found on this offer' });
  }

  return sendResponse({ c, status: 500, success: false, code: error, message: 'Failed to save offer' });
}
