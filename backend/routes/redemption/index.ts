import { Hono } from 'hono';

import categoryRouteInvoker from './category';

const app = new Hono();

export default function routesInvoker() {
  app.route('/category', categoryRouteInvoker());

  return app;
}
