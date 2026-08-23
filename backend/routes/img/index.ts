import { Hono } from 'hono';

// Middleware
import { withRouteErrorHandling } from 'backend/utils/request';
import { rateLimit } from 'backend/utils/rateLimit';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';
import { transformImage } from 'backend/utils/image';
import { getFallbackAvatarURL } from 'backend/utils/avatar';

// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Types
import type InternalUser from 'types/User/InternalUser';

const CACHE_MAX_AGE_SECONDS = 259200; // 3 days
const MAX_USER_ID_LENGTH = 128;

const avatarRateLimit = rateLimit({
  keyPrefix: 'img:avatar',
  maxRequests: 300,
  windowSeconds: 60,
});

const app = new Hono();

export default function routesInvoker() {
  app.get(
    '/avatar/:userID',
    avatarRateLimit,
    withRouteErrorHandling,
    async (c) => {
      const userID = c.req.param('userID');
      if (!userID || userID.length > MAX_USER_ID_LENGTH) {
        return c.body(null, 404);
      }

      const { db } = getGlobalObject();
      const user = await db.collection<InternalUser>(DatabaseCollections.users).findOne(
        { userID },
        { projection: { avatar: 1 } },
      );

      if (!user) return c.body(null, 404);

      const width = Number.parseInt(c.req.query('width') ?? '', 10);
      const height = Number.parseInt(c.req.query('height') ?? '', 10);

      let image: Buffer | null = null;
      if (user.avatar) {
        image = await transformImage(user.avatar, width, height);
      }

      if (!image) {
        image = await transformImage(getFallbackAvatarURL(userID), width, height);
      }

      if (!image) return c.body(null, 404);

      return new Response(new Uint8Array(image), {
        status: 200,
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': `public, max-age=${CACHE_MAX_AGE_SECONDS}`,
          'X-Content-Type-Options': 'nosniff',
        },
      });
    },
  );

  return app;
}
