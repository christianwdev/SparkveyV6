import { Hono } from 'hono';

// Middleware
import { optionalAuth } from 'backend/middleware/auth';

// Utils
import { withRouteErrorHandling } from 'backend/utils/request';
import SiteConfig from 'backend/config/config';
import { getOfferwallEmbed } from 'backend/utils/walls';
import { createToroxWallSession } from 'backend/utils/walls/torox';

// Types
import type InternalUser from 'types/User/InternalUser';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  // Torox iframe entry: create a partner session and redirect to their wall URL.
  // Catalog gates (banned / email / earn) match GET /offerwalls/:wallID.
  app.get('/torox', optionalAuth, withRouteErrorHandling, async (c) => {
    const frontendURL = (SiteConfig.server.frontendURL || 'https://sparkvey.com').replace(/\/$/, '');
    const user = c.get('user');

    if (!user) {
      return c.redirect(`${frontendURL}/login?redirect=${encodeURIComponent('/walls/torox')}`);
    }

    const embedResult = getOfferwallEmbed({ wallID: 'torox', user });

    if (!embedResult.ok) return c.redirect(frontendURL);

    const result = await createToroxWallSession({ userID: user.userID });

    if (!result.ok) return c.redirect(frontendURL);

    return c.redirect(result.data.wallUrl);
  });

  return app;
}
