import { Hono } from 'hono';

// Route Invokers
import emailRouteInvoker from './email';

const app = new Hono();

export default function routesInvoker() {
  app.route('/email', emailRouteInvoker());

  return app;
}
