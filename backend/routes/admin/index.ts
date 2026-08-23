import { Hono } from 'hono';

// Middleware
import { requireAdmin } from 'backend/middleware/auth';

// Routes
import usersRouteInvoker from './users';
import dashboardRouteInvoker from './dashboard';
import withdrawalsRouteInvoker from './withdrawals';
import earningsRouteInvoker from './earnings';
import promocodesRouteInvoker from './promocodes';
import announcementsRouteInvoker from './announcements';
import chatRouteInvoker from './chat';

// Types
import type InternalUser from 'types/User/InternalUser';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.use(requireAdmin());

  app.route('/users', usersRouteInvoker());
  app.route('/dashboard', dashboardRouteInvoker());
  app.route('/withdrawals', withdrawalsRouteInvoker());
  app.route('/earnings', earningsRouteInvoker());
  app.route('/promocodes', promocodesRouteInvoker());
  app.route('/announcements', announcementsRouteInvoker());
  app.route('/chat', chatRouteInvoker());

  return app;
}
