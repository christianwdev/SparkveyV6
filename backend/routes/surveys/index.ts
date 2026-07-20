import { Hono } from 'hono';

// Middleware
import { requireAuth, requireUserID } from 'backend/middleware/auth';
import {
  withRouteErrorHandling,
  getCountryFromRequest,
  getIPFromRequest,
} from 'backend/utils/request';

// Utils
import { fetchCpxSurveys } from 'backend/utils/cpxresearch';
import { sendResponse } from 'backend/utils/response';

// Types
import type InternalUser from 'types/User/InternalUser';
import SiteConfig from 'backend/config/config';

const app = new Hono<{ Variables: { user: InternalUser } }>();

export default function routesInvoker() {
  app.get('/', requireAuth, withRouteErrorHandling, async (c) => {
    const user = c.get('user');
    const ipUser = getIPFromRequest(c) ?? '';
    const userAgent = c.req.header('user-agent') ?? undefined;
    const country = getCountryFromRequest(c);
    const limitParam = c.req.query('limit');
    const limit = limitParam ? Number(limitParam) : undefined;

    if (limitParam !== undefined && (!Number.isFinite(limit) || (limit ?? 0) < 1)) {
      return sendResponse({ c, status: 400, success: false, message: 'Invalid limit' });
    }

    const result = await fetchCpxSurveys({
      user,
      ipUser,
      userAgent,
      limit,
      fallbackCountry: country,
    });

    if (!result.ok) {
      switch (result.error) {
        case 'notConfigured':
          return sendResponse({
            c,
            status: 503,
            success: false,
            message: 'Surveys are not configured',
          });
        case 'missingIp':
          return sendResponse({
            c,
            status: 400,
            success: false,
            message: 'Unable to determine client IP',
          });
        case 'invalidResponse':
          return sendResponse({
            c,
            status: 502,
            success: false,
            message: 'Invalid response from survey provider',
          });
        case 'upstreamError':
        default:
          return sendResponse({
            c,
            status: 502,
            success: false,
            message: 'Failed to load surveys',
          });
      }
    }

    return sendResponse({
      c,
      status: 200,
      success: true,
      data: result.data,
    });
  });

  app.get('/redirect/:surveyId', requireUserID, withRouteErrorHandling, async (c) => {
    const surveyId = c.req.param('surveyId');
    const userId = c.get('userID');

    if (!surveyId) {
      return sendResponse({
        c,
        status: 400,
        success: false,
        message: 'Survey ID is required',
      });
    }

    const redirectURL = new URL('https://offers.cpx-research.com/index.php');
    redirectURL.searchParams.set('app_id', SiteConfig.surveys.cpxresearch.appId ?? '');
    redirectURL.searchParams.set('ext_user_id', userId);
    redirectURL.searchParams.set('survey_id', surveyId);

    return c.redirect(redirectURL.toString());
  });

  return app;
}
