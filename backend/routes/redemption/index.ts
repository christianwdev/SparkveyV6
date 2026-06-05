import { Hono } from 'hono';

import categoryRouteInvoker from './category';
import purchaseRouteInvoker from './purchase';

const app = new Hono();

export default function routesInvoker() {
  app.route('/category', categoryRouteInvoker());
  app.route('/purchase', purchaseRouteInvoker());

  return app;
}
