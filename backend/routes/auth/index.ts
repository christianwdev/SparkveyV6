import { Hono } from 'hono';

// Route Invokers
import accountRouteInvoker from './account';
import emailRouteInvoker from './email';
import googleRouteInvoker from './google';
import logoutRouteInvoker from './logout';

const app = new Hono();

export default function routesInvoker() {
  app.route('/account', accountRouteInvoker());
  app.route('/email', emailRouteInvoker());
  app.route('/google', googleRouteInvoker());
  app.route('/logout', logoutRouteInvoker());

  return app;
}
