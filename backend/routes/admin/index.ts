import { Hono } from 'hono';

// Middleware
import { requireAdmin } from 'backend/middleware/auth';

// Routes
import usersRouteInvoker from './users';
import dashboardRouteInvoker from './dashboard';
import withdrawalsRouteInvoker from './withdrawals';

// Types
import type InternalUser from 'types/User/InternalUser';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.use(requireAdmin());

  app.route('/users', usersRouteInvoker());
  app.route('/dashboard', dashboardRouteInvoker());
  app.route('/withdrawals', withdrawalsRouteInvoker());

  return app;
}
