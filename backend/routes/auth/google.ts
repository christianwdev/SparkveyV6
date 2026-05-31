import { Hono } from 'hono';
import { OAuth2Client } from 'google-auth-library';

// Config
import config from 'backend/config/config';

// Types
import type GoogleAPIUser from 'types/External/Google/GoogleAPIUser';

// Utils
import { startSession } from 'backend/utils/session';
import { createUser, getRawUser } from 'backend/utils/user';
import { buildFrontendURL } from 'backend/utils/frontendUrl';

const app = new Hono();

const OAUTH_SCOPE = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid';

function getOAuthClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${config.server.backendURL}/auth/google/callback`,
  );
}

function getSafeRedirectPath(redirectPath?: string): string {
  if (!redirectPath || !redirectPath.startsWith('/') || redirectPath.startsWith('//')) return '/';

  return redirectPath;
}

export default function routeInvoker() {
  const OAuthClient = getOAuthClient();

  app.get('/login', (c) => {
    const statePayload: Record<string, string> = {};
    const ref = c.req.query('ref');
    const redirect = c.req.query('redirect');

    if (typeof ref === 'string') statePayload.affiliateCode = ref;
    if (typeof redirect === 'string') statePayload.redirect = getSafeRedirectPath(redirect);

    const state = Object.keys(statePayload).length > 0
      ? encodeURIComponent(JSON.stringify(statePayload))
      : undefined;

    const authURL = OAuthClient.generateAuthUrl({
      access_type: 'offline',
      scope: OAUTH_SCOPE,
      include_granted_scopes: true,
      state,
    });

    return c.redirect(authURL);
  });

  app.get('/callback', async (c) => {
    const callbackError = c.req.query('error');
    const code = c.req.query('code');
    const state = c.req.query('state');

    if (callbackError || !code) return c.redirect(buildFrontendURL('/', { error: 'google_callback' }));

    try {
      const { tokens } = await OAuthClient.getToken(code);
      if (!tokens?.id_token) return c.redirect(buildFrontendURL('/', { error: 'google_token' }));

      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokens.id_token}`);
      if (!response.ok) return c.redirect(buildFrontendURL('/', { error: 'google_profile' }));

      const data = await response.json() as GoogleAPIUser;

      if (data.aud !== process.env.GOOGLE_CLIENT_ID) return c.redirect(buildFrontendURL('/', { error: 'google_audience' }));
      if (!data.email || !data.picture || !data.sub) {
        return c.redirect(buildFrontendURL('/', { error: 'google_user' }));
      }

      let affiliateCode: string | undefined;
      let redirectPath = '/';

      if (state) {
        try {
          const stateData = JSON.parse(decodeURIComponent(state)) as {
            affiliateCode?: string,
            redirect?: string,
          };

          affiliateCode = stateData.affiliateCode;
          redirectPath = getSafeRedirectPath(stateData.redirect);
        } catch {
          // Ignore invalid state data and continue with safe defaults.
        }
      }

      const [ userError, existingUser ] = await getRawUser({
        $or: [
          { 'emailInformation.emailAddress': data.email },
          { 'socialInformation.google.emailAddress': data.email },
          { 'socialInformation.google.id': data.sub },
        ],
      });

      if (userError && userError !== 'notFound') return c.redirect(buildFrontendURL('/', { error: 'internal' }));

      let user = existingUser;

      if (user) {
        const isBanned = user.bannedUntil && user.bannedUntil > new Date();
        if (isBanned) return c.redirect(buildFrontendURL('/', { error: 'banned' }));
      } else {
        const [ creationError, newUser ] = await createUser({
          email: data.email,
          googleID: data.sub,
          referredBy: affiliateCode,
          avatar: data.picture,
          username: data.email.split('@')[0],
          emailVerifiedAt: new Date(),
        });

        if (creationError) return c.redirect(buildFrontendURL('/', { error: 'google_create' }));

        user = newUser;
      }

      const [ sessionError ] = await startSession({ c, userID: user.userID });
      if (sessionError) return c.redirect(buildFrontendURL('/', { error: 'session' }));

      return c.redirect(buildFrontendURL(redirectPath));
    } catch (error) {
      console.error(error);

      return c.redirect(buildFrontendURL('/', { error: 'internal' }));
    }
  });

  return app;
}
