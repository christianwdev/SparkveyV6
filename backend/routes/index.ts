import { Hono } from 'hono';
import authRouteInvoker from './auth';

const app = new Hono();

export default function routesInvoker() {
  app.route('/auth', authRouteInvoker());

  return app;
}
