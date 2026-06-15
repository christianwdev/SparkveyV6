import { Hono } from 'hono';
import authRouteInvoker from './auth';
import postbackRouteInvoker from './postback';
import redemptionRouteInvoker from './redemption';
import affiliatesRouteInvoker from './affiliates';
import profileRouteInvoker from './profile';

const app = new Hono();

export default function routesInvoker() {
  app.route('/auth', authRouteInvoker());
  app.route('/postback', postbackRouteInvoker());
  app.route('/redemption', redemptionRouteInvoker());
  app.route('/profile', profileRouteInvoker());
  app.route('/affiliates', affiliatesRouteInvoker());

  return app;
}
