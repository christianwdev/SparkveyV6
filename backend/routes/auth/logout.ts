import { Hono } from 'hono';
import { deleteCookie, getCookie } from 'hono/cookie';

// Middleware
import { requireAuth } from 'backend/middleware/auth';
import { withRouteErrorHandling } from 'backend/utils/request';

// Utils
import { deleteSession } from 'backend/utils/session';
import { sendResponse } from 'backend/utils/response';
import { clearCsrfCookie } from 'backend/utils/csrf';
import { SESSION_COOKIE_NAME, getClearCookieOptions } from 'backend/utils/cookies';

// Types
import type InternalUser from 'types/User/InternalUser';
import type UserSession from 'types/UserSession';

const app = new Hono<{ Variables: { user: InternalUser, session: UserSession } }>();

export default function routesInvoker() {
  app.post('/', requireAuth, withRouteErrorHandling, async (c) => {
    const session = c.get('session');
    const sessionID = session.sessionID || getCookie(c, SESSION_COOKIE_NAME);

    if (sessionID) {
      await deleteSession({ sessionID });
    }

    deleteCookie(c, SESSION_COOKIE_NAME, getClearCookieOptions());
    clearCsrfCookie(c);

    return sendResponse({
      c,
      status: 200,
      success: true,
      message: 'Signed out',
    });
  });

  return app;
}
