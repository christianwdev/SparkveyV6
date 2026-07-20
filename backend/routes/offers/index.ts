import { Hono } from 'hono';

// Middleware
import { optionalAuth } from 'backend/middleware/auth';
import {
  withRouteErrorHandling,
  getCountryFromRequest,
  getIPFromRequest,
} from 'backend/utils/request';

// Utils
import {
  getHomepageOffers,
  getOffersByCategory,
} from 'backend/utils/offers/fetch';
import { fetchCpxSurveys } from 'backend/utils/cpxresearch';
import { sendResponse } from 'backend/utils/response';

// Types
import type InternalUser from 'types/User/InternalUser';
import type OfferType from 'types/Offer/OfferType';
import { OfferTypeSet } from 'types/Offer/OfferType';
import type SanitizedCPXSurvey from 'types/CPX/SanitizedCPXSurvey';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.get('/homepage', optionalAuth, withRouteErrorHandling, async (c) => {
    const country = getCountryFromRequest(c) ?? '';
    const ip = getIPFromRequest(c) ?? '';
    const user = c.get('user');

    const [ offers, surveys ] = await Promise.all([
      getHomepageOffers({ country }),
      fetchCpxSurveys({
        user,
        ipUser: ip,
        userAgent: c.req.header('user-agent') ?? undefined,
        fallbackCountry: country || undefined,
      }),
    ]);

    return c.json({
      ...offers,
      surveys: surveys.ok ? surveys.data : [],
    });
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
