import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

// Middleware
import { optionalAuth, requireAuth } from 'backend/middleware/auth';
import { requireCsrf } from 'backend/middleware/csrf';
import {
  withRouteErrorHandling,
  getCountryFromRequest,
  getIPFromRequest,
} from 'backend/utils/request';

// Utils
import {
  browseOffers,
  getHomepageOffers,
  getOffersByCategory,
} from 'backend/utils/offers/fetch';
import { fetchCpxSurveys } from 'backend/utils/cpxresearch';
import { sendResponse } from 'backend/utils/response';

// Types
import type InternalUser from 'types/User/InternalUser';
import type OfferType from 'types/Offer/OfferType';
import { OfferTypeSet } from 'types/Offer/OfferType';
import type OfferWallType from 'types/Offer/OfferWallType';
import { BrowseOffersSorts, DEFAULT_BROWSE_OFFERS_SORT } from 'types/Offer/BrowseOffersSort';

const BROWSE_PROVIDERS = [
  'lootably',
  'waxrewards',
  'ayetstudios',
] as const satisfies readonly OfferWallType[];

const browseBodySchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(28),
  skip: z.number().int().min(0).optional().default(0),
  sort: z.enum(BrowseOffersSorts).optional().default(DEFAULT_BROWSE_OFFERS_SORT),
  search: z.string().max(120).optional(),
  categories: z.array(z.string()).optional().default([]),
  providers: z.array(z.string()).optional().default([]),
});

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
      surveys: surveys.ok ? surveys.data.slice(0, 12) : [],
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

  app.post(
    '/browse',
    requireAuth,
    requireCsrf,
    withRouteErrorHandling,
    zValidator('json', browseBodySchema),
    async (c) => {
      const body = c.req.valid('json');
      const country = getCountryFromRequest(c) ?? '';

      const categories: OfferType[] = [];

      for (const category of body.categories) {
        if (!OfferTypeSet.has(category)) {
          return sendResponse({ c, status: 400, success: false, message: 'Invalid category' });
        }

        categories.push(category as OfferType);
      }

      const providers: OfferWallType[] = [];

      for (const provider of body.providers) {
        if (!(BROWSE_PROVIDERS as readonly string[]).includes(provider)) {
          return sendResponse({ c, status: 400, success: false, message: 'Invalid provider' });
        }

        providers.push(provider as OfferWallType);
      }

      const offers = await browseOffers({
        country,
        categories,
        providers,
        search: body.search,
        sort: body.sort,
        skip: body.skip,
        limit: body.limit,
      });

      return sendResponse({ c, status: 200, success: true, data: offers });
    },
  );

  return app;
}
