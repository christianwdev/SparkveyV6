import { Hono } from 'hono';
import authRouteInvoker from './auth';
import userRouteInvoker from './user';
import postbackRouteInvoker from './postback';
import redemptionRouteInvoker from './redemption';
import affiliatesRouteInvoker from './affiliates';
import profileRouteInvoker from './profile';
import offersRouteInvoker from './offers';
import landingRouteInvoker from './landing';
import surveysRouteInvoker from './surveys';
import leaderboardRouteInvoker from './leaderboard';
import offerwallsRouteInvoker from './offerwalls';
import wallsRouteInvoker from './walls';
import adminRouteInvoker from './admin';
import announcementsRouteInvoker from './announcements';
import webhooksRouteInvoker from './webhooks';
import supportRouteInvoker from './support';

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
  app.route('/surveys', surveysRouteInvoker());
  app.route('/leaderboard', leaderboardRouteInvoker());
  app.route('/offerwalls', offerwallsRouteInvoker());
  app.route('/walls', wallsRouteInvoker());
  app.route('/admin', adminRouteInvoker());
  app.route('/announcements', announcementsRouteInvoker());
  app.route('/support', supportRouteInvoker());
  app.route('/webhooks', webhooksRouteInvoker());

  return app;
}
