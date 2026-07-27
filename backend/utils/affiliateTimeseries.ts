import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import SiteConfig from 'backend/config/config';
import { getGlobalObject } from 'backend/utils/globalObject';

// Types
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
  bucketFormatter: (date: dayjs.Dayjs) => string,
  labelFormatter: (date: dayjs.Dayjs) => string,
  stepUnit: dayjs.ManipulateType,
  stepAmount: number,
  truncateUnit: dayjs.OpUnitType,
};

function buildEmptyTimeseries(config: AggregationConfig): AffiliateTimeseriesPoint[] {
  const points: AffiliateTimeseriesPoint[] = [];
  const iterationStart = config.startDate.clone().startOf(config.truncateUnit);
  const iterationEnd = config.endDate.clone().startOf(config.truncateUnit);

  for (
    let cursor = iterationStart.clone();
    cursor.isBefore(iterationEnd) || cursor.isSame(iterationEnd);
    cursor = cursor.add(config.stepAmount, config.stepUnit)
  ) {
    points.push({
      date: config.labelFormatter(cursor),
      totalEarnings: 0,
    });
  }

  return points;
}

function getPeriodConfig(period: AffiliatePeriod): AggregationConfig {
  const now = dayjs.utc();
  const isoWeekday = now.day();
  const mondayOffset = (isoWeekday + 6) % 7;
  const isoWeekStart = now.clone().subtract(mondayOffset, 'day').startOf('day');
  const isoWeekEnd = isoWeekStart.clone().add(6, 'day').endOf('day');

  const configs: Record<AffiliatePeriod, AggregationConfig> = {
    day: {
      startDate: now.clone().startOf('day'),
      endDate: now.clone().endOf('day'),
      bucketFormat: '%Y-%m-%dT%H:00:00Z',
      bucketFormatter: date => date.clone().startOf('hour').format('YYYY-MM-DDTHH:00:00[Z]'),
      labelFormatter: date => date.format('HH:00'),
      stepUnit: 'hour',
      stepAmount: 1,
      truncateUnit: 'hour',
    },
    week: {
      startDate: isoWeekStart,
      endDate: isoWeekEnd,
      bucketFormat: '%Y-%m-%dT00:00:00Z',
      bucketFormatter: date => date.clone().startOf('day').format('YYYY-MM-DDT00:00:00[Z]'),
      labelFormatter: date => date.format('ddd'),
      stepUnit: 'day',
      stepAmount: 1,
      truncateUnit: 'day',
    },
    month: {
      startDate: now.clone().startOf('month'),
      endDate: now.clone().endOf('day'),
      bucketFormat: '%Y-%m-%dT00:00:00Z',
      bucketFormatter: date => date.clone().startOf('day').format('YYYY-MM-DDT00:00:00[Z]'),
      labelFormatter: date => date.format('DD/MM'),
      stepUnit: 'day',
      stepAmount: 1,
      truncateUnit: 'day',
    },
    year: {
      startDate: now.clone().startOf('year'),
      endDate: now.clone().endOf('day'),
      bucketFormat: '%Y-%m-01T00:00:00Z',
      bucketFormatter: date => date.clone().startOf('month').format('YYYY-MM-01T00:00:00[Z]'),
      labelFormatter: date => date.format('MM/YY'),
      stepUnit: 'month',
      stepAmount: 1,
      truncateUnit: 'month',
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
    const empty = buildEmptyTimeseries(config);
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

    const points: AffiliateTimeseriesPoint[] = [];
    const iterationStart = config.startDate.clone().startOf(config.truncateUnit);
    const iterationEnd = config.endDate.clone().startOf(config.truncateUnit);

    for (
      let cursor = iterationStart.clone();
      cursor.isBefore(iterationEnd) || cursor.isSame(iterationEnd);
      cursor = cursor.add(config.stepAmount, config.stepUnit)
    ) {
      const bucketKey = config.bucketFormatter(cursor);

      points.push({
        date: config.labelFormatter(cursor),
        totalEarnings: earningsByBucket.get(bucketKey) ?? 0,
      });
    }

    return { ok: true, data: points };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}
