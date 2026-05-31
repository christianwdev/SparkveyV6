import { Hono } from 'hono';

// Route Invokers
import emailRouteInvoker from './email';
import googleRouteInvoker from './google';

const app = new Hono();

export default function routesInvoker() {
  app.route('/email', emailRouteInvoker());
  app.route('/google', googleRouteInvoker());

  return app;
}
