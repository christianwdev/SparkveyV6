import { Hono } from 'hono';

import { beginGoogleOAuthLogin, completeGoogleOAuthLogin } from 'backend/utils/auth/google';
import { buildFrontendURL } from 'backend/utils/frontendUrl';
import { startSession } from 'backend/utils/session';

const app = new Hono();

export default function routeInvoker() {
  app.get('/login', async (c) => {
    const ref = c.req.query('ref');
    const redirect = c.req.query('redirect');

    const authURL = await beginGoogleOAuthLogin({
      affiliateCode: typeof ref === 'string' ? ref : undefined,
      redirect: typeof redirect === 'string' ? redirect : undefined,
    });

    return c.redirect(authURL);
  });

  app.get('/callback', async (c) => {
    const result = await completeGoogleOAuthLogin({
      code: c.req.query('code'),
      state: c.req.query('state'),
      callbackError: c.req.query('error'),
    });

    if (!result.ok) {
      return c.redirect(result.redirectURL);
    }

    const sessionResult = await startSession({ c, userID: result.userID });

    if (!sessionResult.ok) {
      return c.redirect(buildFrontendURL('/', { error: 'session' }));
    }

    return c.redirect(result.redirectURL);
  });

  return app;
}
