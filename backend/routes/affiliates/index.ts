import { Hono } from 'hono';

// Middleware
import { requireAuth } from 'backend/middleware/auth';

// Utils
import { withRouteErrorHandling } from 'backend/utils/request';
import { claimReferralEarnings, createAffiliateCode, disableAffiliateCode, getNumberOfUsersAffiliateCodes, useAffiliateCode } from 'backend/utils/affiliateCode';
import RouteResponseError from 'types/RouteResponseError';

// Types
import type InternalUser from 'types/User/InternalUser';
import { sendResponse } from 'backend/utils/response';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.use(requireAuth);

  const codeBodySchema = z.object({
    code: z.string().min(1).max(36).regex(/^[a-zA-Z0-9]+$/),
  });

  app.post('/create', withRouteErrorHandling, zValidator('json', codeBodySchema), async (c) => {
    const user = c.get('user');
    const code = c.req.valid('json').code;

    const numberOfUsersAffiliateCodesResult = await getNumberOfUsersAffiliateCodes({
      userID: user.userID,
    });

    if (!numberOfUsersAffiliateCodesResult.ok) throw new RouteResponseError({ status: 500, message: numberOfUsersAffiliateCodesResult.error });
    if (numberOfUsersAffiliateCodesResult.data >= user.userConfiguration.maxAffiliateCodes) throw new RouteResponseError({ status: 400, message: 'Maximum number of affiliate codes reached' });

    const createCodeResult = await createAffiliateCode({
      userID: user.userID,
      code,
    });

    if (!createCodeResult.ok) throw new RouteResponseError({ status: 500, message: createCodeResult.error });

    return sendResponse({ c, status: 200, success: true, data: { code: createCodeResult.data.code } });
  });

  app.post('/disable', withRouteErrorHandling, zValidator('json', codeBodySchema), async (c) => {
    const user = c.get('user');
    const code = c.req.valid('json').code;

    const disableCodeResult = await disableAffiliateCode({
      userID: user.userID,
      code,
    });

    if (!disableCodeResult.ok) throw new RouteResponseError({ status: 500, message: disableCodeResult.error });

    return sendResponse({ c, status: 200, success: true, data: { code: disableCodeResult.data.code } });
  });

  app.post('/use', withRouteErrorHandling, zValidator('json', codeBodySchema), async (c) => {
    const user = c.get('user');
    const code = c.req.valid('json').code;

    const useCodeResult = await useAffiliateCode({
      userID: user.userID,
      code,
    });

    if (!useCodeResult.ok) throw new RouteResponseError({ status: 500, message: useCodeResult.error });

    return sendResponse({ c, status: 200, success: true, message: `You are now using referral code: ${useCodeResult.data.code}` });
  });

  app.post('/claim', withRouteErrorHandling, async (c) => {
    const user = c.get('user');

    const claimReferralEarningsResult = await claimReferralEarnings({
      userID: user.userID,
    });

    if (!claimReferralEarningsResult.ok) throw new RouteResponseError({ status: 500, message: claimReferralEarningsResult.error });

    return sendResponse({ c, status: 200, success: true, message: 'Referral earnings claimed successfully' });
  });

  return app;
}
