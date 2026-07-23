import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

// Utils
import { withRouteErrorHandling } from 'backend/utils/request';
import { sendResponse } from 'backend/utils/response';
import { handlePurchase } from 'backend/utils/redemption';
import { getRewardByID, validateRewardValue } from 'backend/utils/rewards';
import RouteResponseError from 'types/RouteResponseError';
import { requireAuth } from 'backend/middleware/auth';
import { requireCsrf } from 'backend/middleware/csrf';
import { rateLimit } from 'backend/utils/rateLimit';
import { purchaseBodySchema } from 'backend/schemas/redemption/purchase';

// Types
import type InternalUser from 'types/User/InternalUser';
import type UserSession from 'types/UserSession';

const app = new Hono<{ Variables: { user: InternalUser, session: UserSession } }>();

const purchaseRateLimit = rateLimit({
  keyPrefix: 'redemption-purchase',
  maxRequests: 10,
  windowSeconds: 60,
});

function throwRouteError(error: string): never {
  let status: 400 | 404 | 500 = 400;

  if (error === 'internalServerError') {
    status = 500;
  } else if (error === 'notFound' || error === 'rewardUnavailable') {
    status = 404;
  }

  throw new RouteResponseError({ status, message: error });
}

export default function routeInvoker() {
  app.post(
    '/',
    requireAuth,
    requireCsrf,
    purchaseRateLimit,
    withRouteErrorHandling,
    zValidator('json', purchaseBodySchema),
    async (c) => {
      const {
        rewardID,
        value,
        walletAddress,
        currencyCode,
      } = c.req.valid('json');

      const user = c.get('user');

      const rewardResult = await getRewardByID(rewardID);

      if (!rewardResult.ok) throwRouteError(rewardResult.error);

      const valueResult = validateRewardValue({
        reward: rewardResult.data,
        value,
      });

      if (!valueResult.ok) throwRouteError(valueResult.error);

      const purchaseResult = await handlePurchase({
        user,
        reward: rewardResult.data,
        value,
        sparksCost: valueResult.data.sparksCost,
        walletAddress,
        currencyCode,
      });

      if (!purchaseResult.ok) throwRouteError(purchaseResult.error);

      return sendResponse({
        c,
        status: 200,
        success: true,
        data: purchaseResult.data,
      });
    },
  );

  return app;
}
