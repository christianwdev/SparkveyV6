import { Hono } from 'hono';

// Middleware
import { withRouteErrorHandling, getCountryFromRequest } from 'backend/utils/request';

// Utils
import {
  getHomepageOffers,
  getOffersByCategory,
} from 'backend/utils/offers/fetch';
import { sendResponse } from 'backend/utils/response';

// Types
import type InternalUser from 'types/InternalUser';
import type OfferType from 'types/Offer/OfferType';
import { OfferTypeSet } from 'types/Offer/OfferType';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.get('/homepage', withRouteErrorHandling, async (c) => {
    const country = getCountryFromRequest(c) ?? '';
    const offers = await getHomepageOffers({ country });

    return c.json(offers);
  });

  app.get('/category/:slug', withRouteErrorHandling, async (c) => {
    const slug = c.req.param('slug');

    if (!OfferTypeSet.has(slug)) {
      return sendResponse({ c, status: 400, success: false, message: 'Invalid category' });
    }

    const country = getCountryFromRequest(c) ?? '';
    const offers = await getOffersByCategory({ slug: slug as OfferType, country });

    return c.json(offers);
  });

  return app;
}
