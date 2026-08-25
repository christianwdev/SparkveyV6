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
import {
  buildOfferTrackingURL,
  getInternalOfferByID,
  getOfferCompletionSteps,
  getSanitizedOfferByID,
} from 'backend/utils/offers/detail';
import { fetchCpxSurveys } from 'backend/utils/cpxresearch';
import { sendResponse } from 'backend/utils/response';
import SiteConfig from 'backend/config/config';
import { createId } from '@paralleldrive/cuid2';

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

    if (!isOfferType(slug)) {
      return sendResponse({ c, status: 400, success: false, message: 'Invalid category' });
    }

    const country = getCountryFromRequest(c) ?? '';
    const offers = await getOffersByCategory({ slug, country });

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
        if (!isOfferType(category)) {
          return sendResponse({ c, status: 400, success: false, message: 'Invalid category' });
        }

        categories.push(category);
      }

      const providers: OfferWallType[] = [];

      for (const provider of body.providers) {
        if (!isBrowseProvider(provider)) {
          return sendResponse({ c, status: 400, success: false, message: 'Invalid provider' });
        }

        providers.push(provider);
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

  app.get(
    '/redirect/:offerID',
    requireAuth,
    withRouteErrorHandling,
    async (c) => {
      const offerID = c.req.param('offerID');
      const user = c.get('user');
      const frontendURL = SiteConfig.server.frontendURL || '/';
      const country = getCountryFromRequest(c) ?? '';

      if (!offerID) {
        return c.redirect(frontendURL);
      }

      if (user.bannedUntil && user.bannedUntil > new Date()) {
        return c.redirect(frontendURL);
      }

      if (!user.emailInformation.verifiedAt) {
        return c.redirect(frontendURL);
      }

      const offerResult = await getInternalOfferByID({ offerID, country });

      if (!offerResult.ok) {
        return c.redirect(frontendURL);
      }

      if (!offerResult.data.trackingURL) {
        return c.redirect(frontendURL);
      }

      const trackingURL = buildOfferTrackingURL({
        trackingURL: offerResult.data.trackingURL,
        userID: user.userID,
        clickID: createId(),
      });

      // Only allow absolute http(s) redirects to provider tracking URLs.
      if (!/^https?:\/\//i.test(trackingURL)) {
        return c.redirect(frontendURL);
      }

      return c.redirect(trackingURL);
    },
  );

  app.get(
    '/:offerID',
    optionalAuth,
    withRouteErrorHandling,
    async (c) => {
      const offerID = c.req.param('offerID');
      const user = c.get('user');
      const country = getCountryFromRequest(c) ?? '';

      if (!offerID) {
        return sendResponse({
          c,
          status: 400,
          success: false,
          message: 'notFound',
        });
      }

      if (user?.bannedUntil && user.bannedUntil > new Date()) {
        return sendResponse({
          c,
          status: 403,
          success: false,
          code: 'banned',
          message: 'banned',
        });
      }

      const offerResult = await getSanitizedOfferByID({ offerID, country });

      if (!offerResult.ok) {
        return sendResponse({
          c,
          status: offerResult.error === 'notFound' || offerResult.error === 'unavailable' ? 404 : 500,
          success: false,
          message: offerResult.error,
        });
      }

      const completionResult = user
        ? await getOfferCompletionSteps({
          userID: user.userID,
          offerID,
        })
        : { ok: true as const, data: [] as const };

      return sendResponse({
        c,
        status: 200,
        success: true,
        data: {
          offer: offerResult.data,
          completion: completionResult.ok ? completionResult.data : [],
        },
      });
    },
  );

  return app;
}

function isOfferType(value: string): value is OfferType {
  return OfferTypeSet.has(value);
}

type BrowseProvider = (typeof BROWSE_PROVIDERS)[number];

function isBrowseProvider(value: string): value is BrowseProvider {
  for (const provider of BROWSE_PROVIDERS) {
    if (provider === value) return true;
  }

  return false;
}
