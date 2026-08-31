import { randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';

import { isDeletedEmail } from 'backend/utils/deletedAccountFingerprint';
import { buildFrontendURL, getBackendURL } from 'backend/utils/url';
import { getGlobalObject } from 'backend/utils/globalObject';
import {
  createUser,
  getRawUser,
  isSteamID64,
  linkGoogleAccount,
  sanitizeEmail,
  userHasPassword,
} from 'backend/utils/user';
import { expireUserSessions } from 'backend/utils/session';
import { readEnv } from 'backend/utils/env';

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

export type GoogleLinkDecision =
  | { action: 'useExisting' }
  | { action: 'conflict' }
  | { action: 'accountExists' }
  | { action: 'link', clearPassword: boolean, legacySteamID?: string };

export function decideGoogleLink(
  existing: InternalUser,
  googleSub: string,
  googleEmail: string,
): GoogleLinkDecision {
  const storedGoogleId = existing.socialInformation?.google?.id;
  const legacySteamID = isSteamID64(storedGoogleId) ? storedGoogleId : undefined;
  const linkedGoogleId = legacySteamID ? undefined : storedGoogleId;

  if (linkedGoogleId && linkedGoogleId !== googleSub) {
    return { action: 'conflict' };
  }

  if (linkedGoogleId) {
    return { action: 'useExisting' };
  }

  if (userHasPassword(existing)) {
    const primaryEmail = sanitizeEmail(existing.emailInformation.emailAddress);
    const primaryMatchesGoogle = primaryEmail === googleEmail;

    // Verified password account whose primary email is not the Google-proven
    // address (matched via leftover google email): do not rewrite identity.
    if (existing.emailInformation.verifiedAt && !primaryMatchesGoogle) {
      return { action: 'accountExists' };
    }

    const decision: GoogleLinkDecision = {
      action: 'link',
      clearPassword: !existing.emailInformation.verifiedAt,
    };
    if (legacySteamID) decision.legacySteamID = legacySteamID;

    return decision;
  }

  const decision: GoogleLinkDecision = {
    action: 'link',
    clearPassword: false,
  };
  if (legacySteamID) decision.legacySteamID = legacySteamID;

  return decision;
}

function getOAuthClient() {
  const clientID = readEnv('GOOGLE_CLIENT_ID');
  const clientSecret = readEnv('GOOGLE_CLIENT_SECRET');
  const redirectURL = `${getBackendURL()}/auth/google/callback`;

  if (!clientID || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured');
  }

  return new OAuth2Client(clientID, clientSecret, redirectURL);
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
      const decision = decideGoogleLink(existing, data.sub, email);

      if (decision.action === 'conflict') {
        return fail('/', 'google_conflict');
      }

      if (decision.action === 'accountExists') {
        return fail('/login', 'google_account_exists');
      }

      if (decision.action === 'link') {
        const linkResult = await linkGoogleAccount({
          userID: existing.userID,
          googleID: data.sub,
          email,
          avatar: data.picture,
          clearPassword: decision.clearPassword,
          legacySteamID: decision.legacySteamID,
        });

        if (!linkResult.ok) {
          return fail('/', 'google_link');
        }

        if (decision.clearPassword) {
          await expireUserSessions(existing.userID);
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
    avatar: data.picture,
    username: email.split('@')[0],
    emailVerifiedAt: new Date(),
    referralCode: affiliateCode,
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
      audience: readEnv('GOOGLE_CLIENT_ID'),
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
