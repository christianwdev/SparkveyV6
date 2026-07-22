import { randomBytes } from 'crypto';
import { Hono } from 'hono';
import { OAuth2Client } from 'google-auth-library';

// Config
import config from 'backend/config/config';

// Types
import type GoogleAPIUser from 'types/External/Google/GoogleAPIUser';

// Utils
import { startSession } from 'backend/utils/session';
import { createUser, getRawUser, sanitizeEmail } from 'backend/utils/user';
import { buildFrontendURL } from 'backend/utils/frontendUrl';
import { isDeletedEmail } from 'backend/utils/deletedAccountFingerprint';
import { getGlobalObject } from 'backend/utils/globalObject';

const app = new Hono();

const OAUTH_SCOPE = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid';
const OAUTH_STATE_TTL_SECONDS = 600;
const OAUTH_STATE_PREFIX = 'oauth:google:state:';

type GoogleOAuthState = {
  affiliateCode?: string,
  redirect?: string,
};

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

function isGoogleEmailVerified(value: GoogleAPIUser['email_verified']): boolean {
  return value === true || value === 'true';
}

async function storeOAuthState(payload: GoogleOAuthState): Promise<string> {
  const { redisClient } = getGlobalObject();
  const state = randomBytes(32).toString('hex');

  await redisClient.set(
    `${OAUTH_STATE_PREFIX}${state}`,
    JSON.stringify(payload),
    'EX',
    OAUTH_STATE_TTL_SECONDS,
  );

  return state;
}

async function consumeOAuthState(state: string): Promise<GoogleOAuthState | null> {
  const { redisClient } = getGlobalObject();
  const key = `${OAUTH_STATE_PREFIX}${state}`;
  const raw = await redisClient.get(key);

  if (!raw) return null;

  await redisClient.del(key);

  try {
    return JSON.parse(raw) as GoogleOAuthState;
  } catch {
    return null;
  }
}

export default function routeInvoker() {
  const OAuthClient = getOAuthClient();

  app.get('/login', async (c) => {
    const statePayload: GoogleOAuthState = {};
    const ref = c.req.query('ref');
    const redirect = c.req.query('redirect');

    if (typeof ref === 'string') statePayload.affiliateCode = ref;
    if (typeof redirect === 'string') statePayload.redirect = getSafeRedirectPath(redirect);

    const state = await storeOAuthState(statePayload);

    const authURL = OAuthClient.generateAuthUrl({
      access_type: 'offline',
      scope: OAUTH_SCOPE,
      include_granted_scopes: true,
      state,
      prompt: 'select_account',
    });

    return c.redirect(authURL);
  });

  app.get('/callback', async (c) => {
    const callbackError = c.req.query('error');
    const code = c.req.query('code');
    const state = c.req.query('state');

    if (callbackError || !code || !state) {
      return c.redirect(buildFrontendURL('/', { error: 'google_callback' }));
    }

    const stateData = await consumeOAuthState(state);
    if (!stateData) {
      return c.redirect(buildFrontendURL('/', { error: 'google_state' }));
    }

    try {
      const { tokens } = await OAuthClient.getToken(code);
      if (!tokens?.id_token) return c.redirect(buildFrontendURL('/', { error: 'google_token' }));

      const ticket = await OAuthClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const data = ticket.getPayload() as GoogleAPIUser | undefined;

      if (!data?.sub || !data.email || !data.picture) {
        return c.redirect(buildFrontendURL('/', { error: 'google_user' }));
      }

      if (!isGoogleEmailVerified(data.email_verified)) {
        return c.redirect(buildFrontendURL('/', { error: 'google_unverified' }));
      }

      const affiliateCode = stateData.affiliateCode;
      const redirectPath = getSafeRedirectPath(stateData.redirect);

      const existingUserResult = await getRawUser({
        $or: [
          { 'emailInformation.emailAddress': data.email },
          { 'socialInformation.google.emailAddress': data.email },
          { 'socialInformation.google.id': data.sub },
        ],
      });

      if (!existingUserResult.ok && existingUserResult.error !== 'notFound') {
        return c.redirect(buildFrontendURL('/', { error: 'internal' }));
      }

      let user = existingUserResult.ok ? existingUserResult.data : undefined;

      if (user) {
        if (user.deletedAt) return c.redirect(buildFrontendURL('/', { error: 'banned' }));
        const isBanned = user.bannedUntil && user.bannedUntil > new Date();
        if (isBanned) return c.redirect(buildFrontendURL('/', { error: 'banned' }));
      } else {
        const email = sanitizeEmail(data.email);
        if (!email) {
          return c.redirect(buildFrontendURL('/', { error: 'google_create' }));
        }

        const deletedEmail = await isDeletedEmail(email);
        if (!deletedEmail.ok || deletedEmail.data) {
          return c.redirect(buildFrontendURL('/', { error: 'banned' }));
        }

        const createUserResult = await createUser({
          email,
          googleID: data.sub,
          referredBy: affiliateCode,
          avatar: data.picture,
          username: email.split('@')[0],
          emailVerifiedAt: new Date(),
        });

        if (!createUserResult.ok) {
          return c.redirect(buildFrontendURL('/', { error: 'google_create' }));
        }

        user = createUserResult.data;
      }

      const sessionResult = await startSession({ c, userID: user.userID });

      if (!sessionResult.ok) {
        return c.redirect(buildFrontendURL('/', { error: 'session' }));
      }

      return c.redirect(buildFrontendURL(redirectPath));
    } catch (error) {
      console.error(error);

      return c.redirect(buildFrontendURL('/', { error: 'internal' }));
    }
  });

  return app;
}
