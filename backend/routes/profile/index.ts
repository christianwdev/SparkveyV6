import { Hono } from 'hono';

import { requireAuth } from 'backend/middleware/auth';
import type InternalUser from 'types/InternalUser';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.use(requireAuth);

  return app;
}
