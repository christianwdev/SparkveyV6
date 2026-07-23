import { randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';

import config from 'backend/config/config';
import { isDeletedEmail } from 'backend/utils/deletedAccountFingerprint';
import { buildFrontendURL } from 'backend/utils/frontendUrl';
import { getGlobalObject } from 'backend/utils/globalObject';
import {
  createUser,
  getRawUser,
  linkGoogleAccount,
  sanitizeEmail,
  userHasPassword,
} from 'backend/utils/user';
import { expireUserSessions } from 'backend/utils/session';

import type GoogleAPIUser from 'types/External/Google/GoogleAPIUser';
import type InternalUser from 'types/User/InternalUser';

const OAUTH_SCOPE = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid';
const OAUTH_STATE_TTL_SECONDS = 600;
const OAUTH_STATE_PREFIX = 'oauth:google:state:';

export type GoogleOAuthState = {
  affiliateCode?: string,
  redirect?: string,
};

export type GoogleOAuthResult =
  | { ok: true, userID: string, redirectURL: string }
  | { ok: false, redirectURL: string };

type GoogleUserResolveResult =
  | { ok: true, user: InternalUser }
  | { ok: false, redirectURL: string };

function getOAuthClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${config.server.backendURL}/auth/google/callback`,
  );
}

export function getSafeRedirectPath(redirectPath?: string): string {
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

function fail(path: string, error: string): { ok: false, redirectURL: string } {
  return { ok: false, redirectURL: buildFrontendURL(path, { error }) };
}

async function resolveGoogleUser(
  data: GoogleAPIUser,
  email: string,
  affiliateCode?: string,
): Promise<GoogleUserResolveResult> {
  // Prefer an already-linked Google subject — never trust email alone for takeover.
  const byGoogleId = await getRawUser({
    'socialInformation.google.id': data.sub,
    deletedAt: { $exists: false },
  });

  if (!byGoogleId.ok && byGoogleId.error !== 'notFound') {
    return fail('/', 'internal');
  }

  let user = byGoogleId.ok ? byGoogleId.data : undefined;

  if (!user) {
    const byEmail = await getRawUser({
      $or: [
        { 'emailInformation.emailAddress': email },
        { 'socialInformation.google.emailAddress': email },
      ],
      deletedAt: { $exists: false },
    });

    if (!byEmail.ok && byEmail.error !== 'notFound') {
      return fail('/', 'internal');
    }

    if (byEmail.ok) {
      const existing = byEmail.data;
      const linkedGoogleId = existing.socialInformation?.google?.id;

      if (linkedGoogleId && linkedGoogleId !== data.sub) {
        return fail('/', 'google_conflict');
      }

      if (!linkedGoogleId && userHasPassword(existing)) {
        // Verified password accounts must sign in with password (no silent link).
        if (existing.emailInformation.verifiedAt) {
          return fail('/login', 'google_account_exists');
        }

        // Unverified squatter: Google proof reclaims the address.
        const linkResult = await linkGoogleAccount({
          userID: existing.userID,
          googleID: data.sub,
          email,
          avatar: data.picture,
          clearPassword: true,
        });

        if (!linkResult.ok) {
          return fail('/', 'google_link');
        }

        await expireUserSessions(existing.userID);
        user = linkResult.data;
      } else if (!linkedGoogleId) {
        const linkResult = await linkGoogleAccount({
          userID: existing.userID,
          googleID: data.sub,
          email,
          avatar: data.picture,
        });

        if (!linkResult.ok) {
          return fail('/', 'google_link');
        }

        user = linkResult.data;
      } else {
        user = existing;
      }
    }
  }

  if (user) {
    if (user.deletedAt) return fail('/', 'banned');
    if (user.bannedUntil && user.bannedUntil > new Date()) return fail('/', 'banned');

    return { ok: true, user };
  }

  const deletedEmail = await isDeletedEmail(email);
  if (!deletedEmail.ok || deletedEmail.data) {
    return fail('/', 'banned');
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
    return fail('/', 'google_create');
  }

  return { ok: true, user: createUserResult.data };
}

export async function beginGoogleOAuthLogin({
  affiliateCode,
  redirect,
}: {
  affiliateCode?: string,
  redirect?: string,
}): Promise<string> {
  const client = getOAuthClient();
  const statePayload: GoogleOAuthState = {};

  if (affiliateCode) statePayload.affiliateCode = affiliateCode;
  if (redirect) statePayload.redirect = getSafeRedirectPath(redirect);

  const state = await storeOAuthState(statePayload);

  return client.generateAuthUrl({
    access_type: 'offline',
    scope: OAUTH_SCOPE,
    include_granted_scopes: true,
    state,
    prompt: 'select_account',
  });
}

export async function completeGoogleOAuthLogin({
  code,
  state,
  callbackError,
}: {
  code?: string,
  state?: string,
  callbackError?: string,
}): Promise<GoogleOAuthResult> {
  if (callbackError || !code || !state) {
    return fail('/', 'google_callback');
  }

  const stateData = await consumeOAuthState(state);
  if (!stateData) {
    return fail('/', 'google_state');
  }

  try {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens?.id_token) return fail('/', 'google_token');

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const data = ticket.getPayload() as GoogleAPIUser | undefined;

    if (!data?.sub || !data.email || !data.picture) {
      return fail('/', 'google_user');
    }

    if (!isGoogleEmailVerified(data.email_verified)) {
      return fail('/', 'google_unverified');
    }

    const email = sanitizeEmail(data.email);
    if (!email) {
      return fail('/', 'google_create');
    }

    const resolved = await resolveGoogleUser(data, email, stateData.affiliateCode);
    if (!resolved.ok) return resolved;

    return {
      ok: true,
      userID: resolved.user.userID,
      redirectURL: buildFrontendURL(getSafeRedirectPath(stateData.redirect)),
    };
  } catch (error) {
    console.error(error);

    return fail('/', 'internal');
  }
}
