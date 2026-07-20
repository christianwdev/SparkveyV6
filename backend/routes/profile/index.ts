import { Hono } from 'hono';

// Middleware
import { requireAuth } from 'backend/middleware/auth';

// Routes
import historyRouteInvoker from './history';

// Types
import type InternalUser from 'types/User/InternalUser';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.use(requireAuth);
  app.route('/history', historyRouteInvoker());

  return app;
}
