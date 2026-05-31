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

  const [ sessionError, session ] = await consumeSession({
    sessionParams: {
      sessionID,
    },
    ipAddress: getIPFromRequest(c),
  });

  if (sessionError || !session) return await next();

  const [ userError, user ] = await getRawUser({
    userID: session?.userID,
  });

  if (userError || !user) return await next();

  c.set('user', user);

  await next();
}

export async function requireAuth(c: Context<{ Variables: { user: InternalUser, session: UserSession } }>, next: Next) {
  const sessionID = getCookie(c, 'sessionID');

  if (!sessionID) return sendResponse({ c, status: 401, success: false, message: 'You are not signed in' });

  const [ sessionError, session ] = await consumeSession({
    sessionParams: {
      sessionID,
    },
    ipAddress: c.req.header('x-forwarded-for') || '',
  });

  if (sessionError || !session) return sendResponse({ c, status: 401, success: false, message: 'This session is no longer valid' });

  const [ userError, user ] = await getRawUser({
    userID: session?.userID,
  });

  if (userError || !user) return sendResponse({ c, status: 401, success: false, message: 'This user does not exist' });

  c.set('user', user);
  c.set('session', session);

  await next();
}

export async function requireUserID(c: Context<{ Variables: { userID: string } }>, next: Next) {
  const sessionID = getCookie(c, 'sessionID');

  if (!sessionID) return sendResponse({ c, status: 401, success: false, message: 'You are not signed in' });

  const [ sessionError, session ] = await consumeSession({
    sessionParams: {
      sessionID,
    },
    ipAddress: getIPFromRequest(c),
  });

  if (sessionError || !session) return sendResponse({ c, status: 401, success: false, message: 'This session is no longer valid' });

  c.set('userID', session.userID);

  await next();
}

export async function requireAdmin(c: Context<{ Variables: { user: InternalUser } }>, next: Next) {
  const sessionID = getCookie(c, 'sessionID');

  if (!sessionID) return sendResponse({ c, status: 401, success: false, message: 'You are not signed in' });

  const [ sessionError, session ] = await consumeSession({
    sessionParams: {
      sessionID,
    },
    ipAddress: getIPFromRequest(c),
  });

  if (sessionError || !session) return sendResponse({ c, status: 401, success: false, message: 'This session is no longer valid' });

  const [ userError, user ] = await getRawUser({
    userID: session?.userID,
  });

  if (!user) return sendResponse({ c, status: 401, success: false, message: 'This user does not exist' });

  c.set('user', user);

  await next();
}
