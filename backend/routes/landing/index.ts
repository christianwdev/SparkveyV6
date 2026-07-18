import { Hono } from 'hono';

// Middleware
import { withRouteErrorHandling, getCountryFromRequest } from 'backend/utils/request';

// Utils
import { getTotalEarnedUsd } from 'backend/utils/siteStatistics';
import { getPopularOffers } from 'backend/utils/offers/fetch';
import { getLiveActivity } from 'backend/utils/liveActivity';

const app = new Hono();

export default function routesInvoker() {
  app.get('/homepage', withRouteErrorHandling, async (c) => {
    const country = getCountryFromRequest(c) ?? '';

    const [ totalEarned, popularOffers, liveActivity ] = await Promise.all([
      getTotalEarnedUsd(),
      getPopularOffers({ country, limit: 4 }),
      getLiveActivity({ limit: 5 }),
    ]);

    return c.json({
      totalEarned,
      popularOffers,
      liveActivity,
    });
  });

  app.get('/statistics', withRouteErrorHandling, async (c) => {
    const usdEarned = await getTotalEarnedUsd();

    return c.json({ usdEarned });
  });

  return app;
}
