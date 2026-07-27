import { Hono } from 'hono';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

// Utils
import { withRouteErrorHandling } from 'backend/utils/request';
import { sendResponse } from 'backend/utils/response';
import { getSanitizedLeaderboard } from 'backend/utils/leaderboard';
import SiteConfig from 'backend/config/config';
import RouteResponseError from 'types/RouteResponseError';

// Types
import type SanitizedLeaderboard from 'types/SanitizedLeaderboard';

dayjs.extend(utc);

const app = new Hono();

function emptyMonthlyLeaderboard(): SanitizedLeaderboard {
  const start = dayjs.utc().startOf('month');
  const end = dayjs.utc().endOf('month');

  return {
    leaderboardID: start.format('MM/DD/YYYY'),
    type: 'monthly',
    startDate: start.toDate(),
    endDate: end.toDate(),
    prizes: SiteConfig.leaderboard.prizes,
    users: [],
  };
}

export default function routesInvoker() {
  app.get('/monthly', withRouteErrorHandling, async (c) => {
    const result = await getSanitizedLeaderboard({ type: 'monthly' });

    if (!result.ok) throw new RouteResponseError({ status: 500, message: result.error });

    return sendResponse({
      c,
      status: 200,
      success: true,
      data: result.data ?? emptyMonthlyLeaderboard(),
    });
  });

  return app;
}
