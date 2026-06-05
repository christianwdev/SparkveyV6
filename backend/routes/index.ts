import { Hono } from 'hono';
import authRouteInvoker from './auth';
import postbackRouteInvoker from './postback';
import redemptionRouteInvoker from './redemption';

const app = new Hono();

export default function routesInvoker() {
  app.route('/auth', authRouteInvoker());
  app.route('/postback', postbackRouteInvoker());
  app.route('/redemption', redemptionRouteInvoker());

  return app;
}
