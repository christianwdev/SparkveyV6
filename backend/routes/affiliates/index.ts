import { Hono } from 'hono';

// Middleware
import { requireAuth } from 'backend/middleware/auth';
import { requireCsrf } from 'backend/middleware/csrf';

// Utils
import { withRouteErrorHandling } from 'backend/utils/request';
import {
  claimReferralEarnings,
  createAffiliateCode,
  disableAffiliateCode,
  ensureDefaultAffiliateCode,
  getAffiliateCodesByUserID,
  getNumberOfUsersAffiliateCodes,
  getReferralCountByUserID,
  useAffiliateCode,
} from 'backend/utils/affiliateCode';
import { getAffiliateTimeseries } from 'backend/utils/affiliateTimeseries';
import RouteResponseError from 'types/RouteResponseError';

// Types
import type InternalUser from 'types/User/InternalUser';
import type { AffiliatePeriod } from 'types/AffiliateTimeseries';
import { sendResponse } from 'backend/utils/response';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const AFFILIATE_PERIODS = [ 'day', 'week', 'month', 'year' ] as const satisfies readonly AffiliatePeriod[];

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.use(requireAuth);

  app.get('/', withRouteErrorHandling, async (c) => {
    const user = c.get('user');

    await ensureDefaultAffiliateCode({ userID: user.userID });

    const [
      codesResult,
      referralsResult,
      timeseriesResult,
    ] = await Promise.all([
      getAffiliateCodesByUserID(user.userID),
      getReferralCountByUserID({ userID: user.userID }),
      getAffiliateTimeseries({ userID: user.userID, period: 'day' }),
    ]);

    if (!codesResult.ok) throw new RouteResponseError({ status: 500, message: codesResult.error });
    if (!referralsResult.ok) throw new RouteResponseError({ status: 500, message: referralsResult.error });
    if (!timeseriesResult.ok) throw new RouteResponseError({ status: 500, message: timeseriesResult.error });

    return sendResponse({
      c,
      status: 200,
      success: true,
      data: {
        codes: codesResult.data,
        stats: {
          totalReferrals: referralsResult.data,
          totalEarnings: user.referralInformation?.totalEarnings ?? 0,
          pendingEarnings: user.referralInformation?.pendingEarnings ?? 0,
          maxAffiliateCodes: user.userConfiguration.maxAffiliateCodes,
        },
        timeseries: timeseriesResult.data,
      },
    });
  });

  app.get('/timeseries/:period', withRouteErrorHandling, async (c) => {
    const user = c.get('user');
    const period = c.req.param('period');

    if (!(AFFILIATE_PERIODS as readonly string[]).includes(period)) {
      return sendResponse({
        c,
        status: 400,
        success: false,
        message: 'Invalid period',
      });
    }

    const timeseriesResult = await getAffiliateTimeseries({
      userID: user.userID,
      period: period as AffiliatePeriod,
    });

    if (!timeseriesResult.ok) {
      throw new RouteResponseError({ status: 500, message: timeseriesResult.error });
    }

    return sendResponse({
      c,
      status: 200,
      success: true,
      data: timeseriesResult.data,
    });
  });

  app.use(requireCsrf);

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

    if (!createCodeResult.ok) {
      if (createCodeResult.error === 'alreadyExists') {
        throw new RouteResponseError({ status: 400, message: 'Affiliate code already exists' });
      }

      throw new RouteResponseError({ status: 500, message: createCodeResult.error });
    }

    return sendResponse({ c, status: 200, success: true, data: createCodeResult.data });
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

    if (!useCodeResult.ok) {
      if (
        useCodeResult.error === 'alreadyClaimed'
        || useCodeResult.error === 'ownCode'
        || useCodeResult.error === 'notFound'
      ) {
        throw new RouteResponseError({ status: 400, message: useCodeResult.error });
      }

      throw new RouteResponseError({ status: 500, message: useCodeResult.error });
    }

    return sendResponse({ c, status: 200, success: true, message: `You are now using referral code: ${useCodeResult.data.code}` });
  });

  app.post('/claim', withRouteErrorHandling, async (c) => {
    const user = c.get('user');

    const claimReferralEarningsResult = await claimReferralEarnings({
      userID: user.userID,
    });

    if (!claimReferralEarningsResult.ok) {
      if (claimReferralEarningsResult.error === 'noPendingEarnings') {
        throw new RouteResponseError({ status: 400, message: 'noPendingEarnings' });
      }

      throw new RouteResponseError({ status: 500, message: claimReferralEarningsResult.error });
    }

    return sendResponse({
      c,
      status: 200,
      success: true,
      message: 'Referral earnings claimed successfully',
      data: {
        sparks: claimReferralEarningsResult.data.transaction.balanceAfter,
      },
    });
  });

  return app;
}
