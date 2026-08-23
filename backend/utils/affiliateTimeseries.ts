import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import SiteConfig from 'backend/config/config';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';
import { fillTimeSeries } from 'backend/utils/timeSeries';

// Types
import type { TimeSeriesBucketConfig } from 'backend/utils/timeSeries';
import type FunctionResponse from 'types/FunctionResponse';
import type InternalUser from 'types/User/InternalUser';
import type { InternalOfferEarning } from 'types/Earnings/InternalEarning';
import type {
  AffiliatePeriod,
  AffiliateTimeseriesPoint,
} from 'types/AffiliateTimeseries';

dayjs.extend(utc);

type AggregationConfig = {
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  bucketFormat: string,
  timeseries: TimeSeriesBucketConfig,
};

function toTimeseriesPoints(
  config: AggregationConfig,
  valuesByBucket: Map<string, number>,
): AffiliateTimeseriesPoint[] {
  return fillTimeSeries({
    config: config.timeseries,
    valuesByBucket,
    emptyValue: 0,
  }).map(point => ({
    date: point.label,
    totalEarnings: point.value,
  }));
}

function getPeriodConfig(period: AffiliatePeriod): AggregationConfig {
  const now = dayjs.utc();
  const isoWeekday = now.day();
  const mondayOffset = (isoWeekday + 6) % 7;
  const isoWeekStart = now.clone().subtract(mondayOffset, 'day').startOf('day');
  const isoWeekEnd = isoWeekStart.clone().add(6, 'day').endOf('day');

  const dayStart = now.clone().startOf('day');
  const dayEnd = now.clone().endOf('day');
  const monthStart = now.clone().startOf('month');
  const yearStart = now.clone().startOf('year');

  const configs: Record<AffiliatePeriod, AggregationConfig> = {
    day: {
      startDate: dayStart,
      endDate: dayEnd,
      bucketFormat: '%Y-%m-%dT%H:00:00Z',
      timeseries: {
        start: dayStart,
        end: dayEnd,
        bucketKey: date => date.clone().startOf('hour').format('YYYY-MM-DDTHH:00:00[Z]'),
        label: date => date.format('HH:00'),
        stepUnit: 'hour',
        stepAmount: 1,
        truncateUnit: 'hour',
      },
    },
    week: {
      startDate: isoWeekStart,
      endDate: isoWeekEnd,
      bucketFormat: '%Y-%m-%dT00:00:00Z',
      timeseries: {
        start: isoWeekStart,
        end: isoWeekEnd,
        bucketKey: date => date.clone().startOf('day').format('YYYY-MM-DDT00:00:00[Z]'),
        label: date => date.format('ddd'),
        stepUnit: 'day',
        stepAmount: 1,
        truncateUnit: 'day',
      },
    },
    month: {
      startDate: monthStart,
      endDate: dayEnd,
      bucketFormat: '%Y-%m-%dT00:00:00Z',
      timeseries: {
        start: monthStart,
        end: dayEnd,
        bucketKey: date => date.clone().startOf('day').format('YYYY-MM-DDT00:00:00[Z]'),
        label: date => date.format('DD/MM'),
        stepUnit: 'day',
        stepAmount: 1,
        truncateUnit: 'day',
      },
    },
    year: {
      startDate: yearStart,
      endDate: dayEnd,
      bucketFormat: '%Y-%m-01T00:00:00Z',
      timeseries: {
        start: yearStart,
        end: dayEnd,
        bucketKey: date => date.clone().startOf('month').format('YYYY-MM-01T00:00:00[Z]'),
        label: date => date.format('MM/YY'),
        stepUnit: 'month',
        stepAmount: 1,
        truncateUnit: 'month',
      },
    },
  };

  return configs[period];
}

/**
 * Referral commission timeseries derived from referred users' credited earnings.
 * Always returns a full bucket range (zeros when empty) so the chart can render.
 */
export async function getAffiliateTimeseries(
  {
    userID,
    period,
  }: {
    userID: string,
    period: AffiliatePeriod,
  },
): Promise<FunctionResponse<AffiliateTimeseriesPoint[]>> {
  try {
    const { db } = getGlobalObject();
    const config = getPeriodConfig(period);
    const empty = toTimeseriesPoints(config, new Map());
    const rate = SiteConfig.referral.rate;

    if (!Number.isFinite(rate) || rate === 0) {
      return { ok: true, data: empty };
    }

    const referredUsers = await db.collection<InternalUser>(DatabaseCollections.users).find(
      {
        'referralInformation.referredByID': userID,
        deletedAt: { $exists: false },
      },
      { projection: { userID: 1 } },
    ).toArray();

    if (referredUsers.length === 0) {
      return { ok: true, data: empty };
    }

    const referredUserIDs = referredUsers.map(user => user.userID);

    const aggregationResults = await db.collection<InternalOfferEarning>(DatabaseCollections.userEarnings).aggregate<{
      _id: string,
      totalEarnings: number,
    }>([
      {
        $match: {
          userID: { $in: referredUserIDs },
          status: 'completed',
          createdAt: {
            $gte: config.startDate.toDate(),
            $lte: config.endDate.toDate(),
          },
        },
      },
      {
        $project: {
          createdAt: 1,
          commission: {
            $round: [
              { $multiply: [ '$value', rate ] },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: config.bucketFormat,
              date: '$createdAt',
              timezone: 'UTC',
            },
          },
          totalEarnings: { $sum: '$commission' },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    const earningsByBucket = new Map<string, number>();

    for (const result of aggregationResults) {
      earningsByBucket.set(result._id, result.totalEarnings);
    }

    return { ok: true, data: toTimeseriesPoints(config, earningsByBucket) };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}
