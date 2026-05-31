import { Hono } from 'hono';
import authRouteInvoker from './auth';
import postbackRouteInvoker from './postback';

const app = new Hono();

export default function routesInvoker() {
  app.route('/auth', authRouteInvoker());
  app.route('/postback', postbackRouteInvoker());

  return app;
}
