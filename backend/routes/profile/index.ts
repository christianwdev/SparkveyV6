import { Hono } from 'hono';

// Middleware
import { requireAuth } from 'backend/middleware/auth';

// Routes
import historyRouteInvoker from './history';
import sessionsRouteInvoker from './sessions';

// Types
import type InternalUser from 'types/User/InternalUser';
import type UserSession from 'types/UserSession';

const app = new Hono<{ Variables: { user: InternalUser, session: UserSession } }>();

export default function routesInvoker() {
  app.use(requireAuth);
  app.route('/history', historyRouteInvoker());
  app.route('/sessions', sessionsRouteInvoker());

  return app;
}
