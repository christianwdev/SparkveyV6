import { Hono } from 'hono';
import authRouteInvoker from './auth';
import userRouteInvoker from './user';
import postbackRouteInvoker from './postback';
import redemptionRouteInvoker from './redemption';
import affiliatesRouteInvoker from './affiliates';
import profileRouteInvoker from './profile';
import offersRouteInvoker from './offers';
import landingRouteInvoker from './landing';

const app = new Hono();

export default function routesInvoker() {
  app.route('/auth', authRouteInvoker());
  app.route('/user', userRouteInvoker());
  app.route('/postback', postbackRouteInvoker());
  app.route('/redemption', redemptionRouteInvoker());
  app.route('/profile', profileRouteInvoker());
  app.route('/affiliates', affiliatesRouteInvoker());
  app.route('/offers', offersRouteInvoker());
  app.route('/landing', landingRouteInvoker());

  return app;
}
