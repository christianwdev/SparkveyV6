// Utils
import { consumeSession } from '../utils/session';
import { getRawUser } from '../utils/user';
import { getCookie } from 'hono/cookie';
import { getIPFromRequest } from '../utils/request';
import { sendResponse } from '../utils/response';

// Types
import type { Context, Next } from 'hono';
import type InternalUser from 'types/InternalUser';
import type UserSession from 'types/UserSession';

export async function optionalAuth(c: Context<{ Variables: { user: InternalUser } }>, next: Next) {
  const sessionID = getCookie(c, 'sessionID');

  if (!sessionID) return await next();

  const sessionResult = await consumeSession({
    sessionParams: {
      sessionID,
    },
    ipAddress: getIPFromRequest(c) || '',
  });

  if (!sessionResult.ok) return await next();

  const userResult = await getRawUser({
    userID: sessionResult.data.userID,
  });

  if (!userResult.ok) return await next();

  c.set('user', userResult.data);

  await next();
}

export async function requireAuth(c: Context<{ Variables: { user: InternalUser, session: UserSession } }>, next: Next) {
  const sessionID = getCookie(c, 'sessionID');

  if (!sessionID) return sendResponse({ c, status: 401, success: false, message: 'You are not signed in' });

  const sessionResult = await consumeSession({
    sessionParams: {
      sessionID,
    },
    ipAddress: c.req.header('x-forwarded-for') || '',
  });

  if (!sessionResult.ok) return sendResponse({ c, status: 401, success: false, message: 'This session is no longer valid' });

  const userResult = await getRawUser({
    userID: sessionResult.data.userID,
  });

  if (!userResult.ok) return sendResponse({ c, status: 401, success: false, message: 'This user does not exist' });

  c.set('user', userResult.data);
  c.set('session', sessionResult.data);

  await next();
}

export async function requireUserID(c: Context<{ Variables: { userID: string } }>, next: Next) {
  const sessionID = getCookie(c, 'sessionID');

  if (!sessionID) return sendResponse({ c, status: 401, success: false, message: 'You are not signed in' });

  const sessionResult = await consumeSession({
    sessionParams: {
      sessionID,
    },
    ipAddress: getIPFromRequest(c) || '',
  });

  if (!sessionResult.ok) return sendResponse({ c, status: 401, success: false, message: 'This session is no longer valid' });

  c.set('userID', sessionResult.data.userID);

  await next();
}

export async function requireAdmin(c: Context<{ Variables: { user: InternalUser } }>, next: Next) {
  const sessionID = getCookie(c, 'sessionID');

  if (!sessionID) return sendResponse({ c, status: 401, success: false, message: 'You are not signed in' });

  const sessionResult = await consumeSession({
    sessionParams: {
      sessionID,
    },
    ipAddress: getIPFromRequest(c) || '',
  });

  if (!sessionResult.ok) return sendResponse({ c, status: 401, success: false, message: 'This session is no longer valid' });

  const userResult = await getRawUser({
    userID: sessionResult.data.userID,
  });

  if (!userResult.ok) return sendResponse({ c, status: 401, success: false, message: 'This user does not exist' });

  c.set('user', userResult.data);

  await next();
}
