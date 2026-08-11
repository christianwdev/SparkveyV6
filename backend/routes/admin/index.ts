import { Hono } from 'hono';

// Middleware
import { requireAdmin } from 'backend/middleware/auth';

// Routes
import usersRouteInvoker from './users';
import dashboardRouteInvoker from './dashboard';

// Types
import type InternalUser from 'types/User/InternalUser';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.use(requireAdmin());

  app.route('/users', usersRouteInvoker());
  app.route('/dashboard', dashboardRouteInvoker());

  return app;
}
