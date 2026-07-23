import { Hono } from 'hono';

import { requireCsrf } from 'backend/middleware/csrf';
import { withRouteErrorHandling } from 'backend/utils/request';
import { sendResponse } from 'backend/utils/response';
import {
  deleteUserSession,
  getActiveUserSessions,
  sanitizeUserSession,
} from 'backend/utils/session';

// Types
import type InternalUser from 'types/User/InternalUser';
import type UserSession from 'types/UserSession';

const app = new Hono<{ Variables: { user: InternalUser, session: UserSession } }>();

export default function routesInvoker() {
  app.get(
    '/',
    withRouteErrorHandling,
    async (c) => {
      const user = c.get('user');
      const currentSession = c.get('session');

      const sessions = await getActiveUserSessions(user.userID);
      if (!sessions.ok) {
        return sendResponse({
          c,
          status: 500,
          success: false,
          message: 'Failed to load sessions.',
        });
      }

      const data = sessions.data
        .map((session) => sanitizeUserSession(session, currentSession.sessionID))
        .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));

      return sendResponse({
        c,
        status: 200,
        success: true,
        data,
      });
    },
  );

  app.delete(
    '/:sessionID',
    requireCsrf,
    withRouteErrorHandling,
    async (c) => {
      const user = c.get('user');
      const currentSession = c.get('session');
      const sessionID = c.req.param('sessionID');
      if (!sessionID) {
        return sendResponse({
          c,
          status: 400,
          success: false,
          message: 'Session not found.',
        });
      }

      if (sessionID === currentSession.revokeID) {
        return sendResponse({
          c,
          status: 400,
          success: false,
          message: 'You cannot revoke your current session from here.',
        });
      }

      const result = await deleteUserSession({
        sessionID,
        userID: user.userID,
      });

      if (!result.ok) {
        return sendResponse({
          c,
          status: result.error === 'notFound' ? 404 : 500,
          success: false,
          message: result.error === 'notFound'
            ? 'Session not found.'
            : 'Failed to revoke session.',
        });
      }

      return sendResponse({
        c,
        status: 200,
        success: true,
        message: 'Session revoked.',
      });
    },
  );

  return app;
}
