import { Hono } from 'hono';

// Middleware
import { requireAuth } from 'backend/middleware/auth';

// Routes
import historyRouteInvoker from './history';
import sessionsRouteInvoker from './sessions';
import settingsRouteInvoker from './settings';

// Types
import type InternalUser from 'types/User/InternalUser';
import type UserSession from 'types/UserSession';

const app = new Hono<{ Variables: { user: InternalUser, session: UserSession } }>();

export default function routesInvoker() {
  // Settings includes public email confirm links; auth is applied inside the router for POSTs.
  app.route('/settings', settingsRouteInvoker());

  app.use(requireAuth);
  app.route('/history', historyRouteInvoker());
  app.route('/sessions', sessionsRouteInvoker());

  return app;
}
