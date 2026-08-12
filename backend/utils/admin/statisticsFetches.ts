import { ReadPreference, type Document } from 'mongodb';

// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';
import { NON_REVERSED_STATUSES, SITE_STATISTICS_ID } from 'backend/utils/siteStatistics';

// Types
import type AffiliateCode from 'types/AffiliateCode';
import type InternalEarning from 'types/Earnings/InternalEarning';
import type InternalLeaderboard from 'types/InternalLeaderboard';
import type InternalRedemption from 'types/Redemption/InternalRedemption';
import type InternalUser from 'types/User/InternalUser';
import type SiteStatistics from 'types/SiteStatistics';
import type UserSession from 'types/UserSession';

export const STATS_TOP_N = 10;
const STATS_MAX_TIME_MS = 10000; // 10 seconds — abort slow secondary scans

export const STATS_READ = {
  readPreference: ReadPreference.secondaryPreferred,
  maxTimeMS: STATS_MAX_TIME_MS,
} as const;

export type StatsWindow = {
  startDate: Date,
  endDate: Date,
  priorStartDate: Date,
  priorEndDate: Date,
};

export type PeriodSignup = {
  userID: string,
  creationDate: Date,
  referred: boolean,
};

export type EarningsDashboardFacet = {
  periodTotals: Array<{ earnedUsd: number, sparksCredited: number, reversedUsd: number }>,
  priorTotals: Array<{ earnedUsd: number, sparksCredited: number }>,
  activeEarners: Array<{ _id: string }>,
  repeatEarners: Array<{ count: number }>,
  topProviders: Array<{ _id: string, count: number, usdValue: number }>,
  topOffers: Array<{ _id: string, count: number, usdValue: number }>,
  offerTypeMix: Array<{ _id: string, count: number, usdValue: number }>,
  periodUserUsd: Array<{ _id: string, usdValue: number }>,
};

export type RedemptionTotalsFacet = {
  period: Array<{ count: number, usdValue: number }>,
  prior: Array<{ count: number, usdValue: number }>,
};

type WindowDates = {
  startDate: Date,
  endDate: Date,
};

function nonReversedStatuses(): string[] {
  return [ ...NON_REVERSED_STATUSES ];
}

// ─── Aggregation branch builders (composable into $facet) ───

export function buildEarningsTotalsPipeline(
  {
    startDate,
    endDate,
    includeReversed,
  }: WindowDates & {
    includeReversed: boolean,
  },
): Document[] {
  const statuses = nonReversedStatuses();
  const group: Document = {
    _id: null,
    earnedUsd: {
      $sum: {
        $cond: [
          { $in: [ '$status', statuses ] },
          '$usdValue',
          0,
        ],
      },
    },
    sparksCredited: {
      $sum: {
        $cond: [
          { $eq: [ '$status', 'completed' ] },
          '$value',
          0,
        ],
      },
    },
  };

  if (includeReversed) {
    group.reversedUsd = {
      $sum: {
        $cond: [
          { $eq: [ '$status', 'reversed' ] },
          '$usdValue',
          0,
        ],
      },
    };
  }

  const project: Document = {
    _id: 0,
    earnedUsd: 1,
    sparksCredited: 1,
  };
  if (includeReversed) project.reversedUsd = 1;

  return [
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    { $group: group },
    { $project: project },
  ];
}

export function buildActiveEarnersPipeline({ startDate, endDate }: WindowDates): Document[] {
  return [
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: nonReversedStatuses() },
      },
    },
    { $group: { _id: '$userID' } },
  ];
}

export function buildRepeatEarnersPipeline({ startDate, endDate }: WindowDates): Document[] {
  return [
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: nonReversedStatuses() },
      },
    },
    {
      $group: {
        _id: '$userID',
        conversions: { $sum: 1 },
      },
    },
    { $match: { conversions: { $gte: 2 } } },
    { $count: 'count' },
  ];
}

export function buildTopProvidersPipeline({ startDate, endDate }: WindowDates): Document[] {
  return [
    {
      $match: {
        type: 'offer',
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: nonReversedStatuses() },
      },
    },
    {
      $group: {
        _id: '$provider',
        count: { $sum: 1 },
        usdValue: { $sum: '$usdValue' },
      },
    },
    { $sort: { usdValue: -1, count: -1 } },
    { $limit: STATS_TOP_N },
  ];
}

export function buildTopOffersPipeline({ startDate, endDate }: WindowDates): Document[] {
  return [
    {
      $match: {
        type: 'offer',
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: nonReversedStatuses() },
      },
    },
    {
      $group: {
        _id: '$offerID',
        count: { $sum: 1 },
        usdValue: { $sum: '$usdValue' },
      },
    },
    { $sort: { usdValue: -1, count: -1 } },
    { $limit: STATS_TOP_N },
  ];
}

export function buildOfferTypeMixPipeline({ startDate, endDate }: WindowDates): Document[] {
  return [
    {
      $match: {
        type: 'offer',
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: nonReversedStatuses() },
      },
    },
    {
      $group: {
        _id: '$offerID',
        count: { $sum: 1 },
        usdValue: { $sum: '$usdValue' },
      },
    },
    {
      $lookup: {
        from: DatabaseCollections.offers,
        localField: '_id',
        foreignField: 'offerID',
        as: 'offer',
      },
    },
    {
      $unwind: {
        path: '$offer',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: {
          $ifNull: [
            { $arrayElemAt: [ '$offer.offerType', 0 ] },
            'unknown',
          ],
        },
        count: { $sum: '$count' },
        usdValue: { $sum: '$usdValue' },
      },
    },
    { $sort: { usdValue: -1, count: -1 } },
    { $limit: STATS_TOP_N },
  ];
}

export function buildPeriodUserUsdPipeline({ startDate, endDate }: WindowDates): Document[] {
  return [
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: nonReversedStatuses() },
      },
    },
    {
      $group: {
        _id: '$userID',
        usdValue: { $sum: '$usdValue' },
      },
    },
  ];
}

export function buildCompletedRedemptionsPipeline({ startDate, endDate }: WindowDates): Document[] {
  return [
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        usdValue: { $sum: '$usdValue' },
      },
    },
    {
      $project: {
        _id: 0,
        count: 1,
        usdValue: 1,
      },
    },
  ];
}

// ─── Fetch helpers ───

export async function fetchLifetimeEarnedUsd(): Promise<number> {
  const { db } = getGlobalObject();
  const siteDoc = await db.collection<SiteStatistics>(DatabaseCollections.siteStatistics).findOne(
    { _id: SITE_STATISTICS_ID },
    { ...STATS_READ, projection: { totalEarnedUsd: 1 } },
  );

  return siteDoc?.totalEarnedUsd ?? 0;
}

export async function fetchPeriodSignups(
  {
    startDate,
    endDate,
  }: WindowDates,
): Promise<PeriodSignup[]> {
  const { db } = getGlobalObject();
  const docs = await db.collection<InternalUser>(DatabaseCollections.users).find(
    {
      deletedAt: { $exists: false },
      creationDate: { $gte: startDate, $lte: endDate },
    },
    {
      ...STATS_READ,
      projection: {
        userID: 1,
        creationDate: 1,
        'referralInformation.referredByID': 1,
      },
    },
  ).toArray();

  return docs.map(doc => ({
    userID: doc.userID,
    creationDate: doc.creationDate,
    referred: Boolean(doc.referralInformation?.referredByID),
  }));
}

export async function fetchSignupCount(
  {
    startDate,
    endDate,
  }: WindowDates,
): Promise<number> {
  const { db } = getGlobalObject();

  return db.collection<InternalUser>(DatabaseCollections.users).countDocuments(
    {
      deletedAt: { $exists: false },
      creationDate: { $gte: startDate, $lte: endDate },
    },
    STATS_READ,
  );
}

/** One earnings scan; facet branches come from the pipeline builders above. */
export async function fetchEarningsDashboardFacet(
  {
    startDate,
    endDate,
    priorStartDate,
    priorEndDate,
  }: StatsWindow,
): Promise<EarningsDashboardFacet | null> {
  const { db } = getGlobalObject();
  const [ result ] = await db.collection<InternalEarning>(DatabaseCollections.userEarnings).aggregate<EarningsDashboardFacet>([
    {
      $match: {
        createdAt: { $gte: priorStartDate, $lte: endDate },
      },
    },
    {
      $facet: {
        periodTotals: buildEarningsTotalsPipeline({
          startDate,
          endDate,
          includeReversed: true,
        }),
        priorTotals: buildEarningsTotalsPipeline({
          startDate: priorStartDate,
          endDate: priorEndDate,
          includeReversed: false,
        }),
        activeEarners: buildActiveEarnersPipeline({ startDate, endDate }),
        repeatEarners: buildRepeatEarnersPipeline({ startDate, endDate }),
        topProviders: buildTopProvidersPipeline({ startDate, endDate }),
        topOffers: buildTopOffersPipeline({ startDate, endDate }),
        offerTypeMix: buildOfferTypeMixPipeline({ startDate, endDate }),
        periodUserUsd: buildPeriodUserUsdPipeline({ startDate, endDate }),
      },
    },
  ], STATS_READ).toArray();

  return result ?? null;
}

export async function fetchCompletedRedemptionTotals(
  {
    startDate,
    endDate,
    priorStartDate,
    priorEndDate,
  }: StatsWindow,
): Promise<RedemptionTotalsFacet | null> {
  const { db } = getGlobalObject();
  const [ result ] = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).aggregate<RedemptionTotalsFacet>([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: priorStartDate, $lte: endDate },
      },
    },
    {
      $facet: {
        period: buildCompletedRedemptionsPipeline({ startDate, endDate }),
        prior: buildCompletedRedemptionsPipeline({
          startDate: priorStartDate,
          endDate: priorEndDate,
        }),
      },
    },
  ], STATS_READ).toArray();

  return result ?? null;
}

export async function fetchTopAffiliateCodes(): Promise<Array<Pick<AffiliateCode, 'code' | 'totalEarnings' | 'tasksCompleted'>>> {
  const { db } = getGlobalObject();

  return db.collection<AffiliateCode>(DatabaseCollections.affiliateCodes).find(
    {},
    {
      ...STATS_READ,
      projection: {
        code: 1,
        totalEarnings: 1,
        tasksCompleted: 1,
      },
      sort: { totalEarnings: -1 },
      limit: STATS_TOP_N,
    },
  ).toArray();
}

export async function fetchPaidLeaderboardsInWindow(
  {
    startDate,
    endDate,
  }: WindowDates,
): Promise<Array<Pick<InternalLeaderboard, 'prizes' | 'paidUserIDs'>>> {
  const { db } = getGlobalObject();

  return db.collection<InternalLeaderboard>(DatabaseCollections.leaderboards).find(
    {
      payoutDate: { $gte: startDate, $lte: endDate },
    },
    {
      ...STATS_READ,
      projection: {
        prizes: 1,
        paidUserIDs: 1,
      },
    },
  ).toArray();
}

export async function fetchSignupGeoMix(
  {
    signupIds,
  }: {
    signupIds: string[],
  },
): Promise<Array<{ _id: string, count: number }>> {
  if (signupIds.length === 0) return [];

  const { db } = getGlobalObject();

  return db.collection<UserSession>(DatabaseCollections.userSessions).aggregate<{ _id: string, count: number }>([
    { $match: { userID: { $in: signupIds } } },
    { $sort: { userID: 1, issueDate: 1 } },
    {
      $group: {
        _id: '$userID',
        country: { $first: '$country' },
      },
    },
    {
      $group: {
        _id: {
          $ifNull: [ '$country', 'unknown' ],
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ], STATS_READ).toArray();
}

export async function fetchFirstEarnDates(
  {
    userIds,
  }: {
    userIds: string[],
  },
): Promise<Array<{ _id: string, firstAt: Date }>> {
  if (userIds.length === 0) return [];

  const { db } = getGlobalObject();

  return db.collection<InternalEarning>(DatabaseCollections.userEarnings).aggregate<{ _id: string, firstAt: Date }>([
    {
      $match: {
        userID: { $in: userIds },
        status: { $in: nonReversedStatuses() },
      },
    },
    {
      $group: {
        _id: '$userID',
        firstAt: { $min: '$createdAt' },
      },
    },
  ], STATS_READ).toArray();
}

export async function fetchCashoutEarnerIds(
  {
    activeEarnerIds,
  }: {
    activeEarnerIds: string[],
  },
): Promise<string[]> {
  if (activeEarnerIds.length === 0) return [];

  const { db } = getGlobalObject();

  return db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).distinct(
    'userID',
    {
      status: 'completed',
      userID: { $in: activeEarnerIds },
    },
    STATS_READ,
  );
}

export async function fetchReferredEarnerMeta(
  {
    periodEarnerIds,
  }: {
    periodEarnerIds: string[],
  },
): Promise<Array<{
  userID: string,
  referralInformation?: {
    referredBy?: string,
    referredByID?: string,
  },
}>> {
  if (periodEarnerIds.length === 0) return [];

  const { db } = getGlobalObject();

  return db.collection<InternalUser>(DatabaseCollections.users).find(
    {
      userID: { $in: periodEarnerIds },
      'referralInformation.referredByID': { $exists: true, $nin: [ null, '' ] },
    },
    {
      ...STATS_READ,
      projection: {
        userID: 1,
        'referralInformation.referredBy': 1,
        'referralInformation.referredByID': 1,
      },
    },
  ).toArray();
}
