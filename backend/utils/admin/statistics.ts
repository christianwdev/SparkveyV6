import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Utils
import {
  fetchCashoutEarnerIds,
  fetchCompletedRedemptionTotals,
  fetchEarningsDashboardFacet,
  fetchFirstEarnDates,
  fetchLifetimeEarnedUsd,
  fetchPaidLeaderboardsInWindow,
  fetchPeriodSignups,
  fetchReferredEarnerMeta,
  fetchSignupCount,
  fetchSignupGeoMix,
  fetchTopAffiliateCodes,
  STATS_TOP_N,
  type PeriodSignup,
} from 'backend/utils/admin/statisticsFetches';
import {
  countEventsByBucket,
  fillTimeSeries,
  type TimeSeriesBucketConfig,
} from 'backend/utils/timeSeries';

// Types
import type AdminDashboardStatistics from 'types/AdminDashboardStatistics';
import type {
  AdminDashboardAffiliateCodeRank,
  AdminDashboardGeoBucket,
  AdminDashboardOfferTypeBucket,
  AdminDashboardPeriod,
  AdminDashboardRankedCount,
  AdminDashboardTimeseriesPoint,
} from 'types/AdminDashboardStatistics';
import type FunctionResponse from 'types/FunctionResponse';
import type InternalLeaderboard from 'types/InternalLeaderboard';

dayjs.extend(utc);
dayjs.extend(customParseFormat);

export type GetAdminDashboardStatisticsError = 'internalServerError' | 'invalidRange';

const MS_PER_DAY = 86400000;
const CUSTOM_MAX_DAYS = 366; // hard cap so custom ranges cannot unbounded-scan

type PeriodBounds = {
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  priorStart: dayjs.Dayjs,
  priorEnd: dayjs.Dayjs,
  timeseries: TimeSeriesBucketConfig,
};

function withPriorWindow(start: dayjs.Dayjs, end: dayjs.Dayjs): Pick<PeriodBounds, 'priorStart' | 'priorEnd'> {
  const durationMs = end.valueOf() - start.valueOf();

  return {
    priorStart: start.clone().subtract(durationMs + 1, 'millisecond'),
    priorEnd: start.clone().subtract(1, 'millisecond'),
  };
}

function getCustomPeriodBounds(startInput: string, endInput: string): PeriodBounds | null {
  const start = dayjs.utc(startInput, 'YYYY-MM-DD', true).startOf('day');
  const end = dayjs.utc(endInput, 'YYYY-MM-DD', true).endOf('day');

  if (!start.isValid() || !end.isValid()) return null;
  if (end.isBefore(start)) return null;

  const daySpan = end.startOf('day').diff(start.startOf('day'), 'day') + 1;
  if (daySpan < 1 || daySpan > CUSTOM_MAX_DAYS) return null;

  const prior = withPriorWindow(start, end);

  // Keep chart buckets readable across short and long custom windows.
  if (daySpan <= 2) {
    return {
      start,
      end,
      ...prior,
      timeseries: {
        start,
        end,
        truncateUnit: 'hour',
        stepUnit: 'hour',
        stepAmount: 1,
        bucketKey: date => date.clone().startOf('hour').format('YYYY-MM-DDTHH:00:00[Z]'),
        label: date => date.format('MMM D, HH:00'),
      },
    };
  }

  if (daySpan <= 92) {
    return {
      start,
      end,
      ...prior,
      timeseries: {
        start,
        end,
        truncateUnit: 'day',
        stepUnit: 'day',
        stepAmount: 1,
        bucketKey: date => date.clone().startOf('day').format('YYYY-MM-DDT00:00:00[Z]'),
        label: date => date.format('MMM D'),
      },
    };
  }

  return {
    start,
    end,
    ...prior,
    timeseries: {
      start,
      end,
      truncateUnit: 'day',
      stepUnit: 'week',
      stepAmount: 1,

      // Monday-based weeks to match the `week` preset (dayjs startOf('week') is Sunday).
      bucketKey: date => startOfIsoWeek(date).format('YYYY-MM-DDT00:00:00[Z]'),
      label: date => startOfIsoWeek(date).format('MMM D'),
    },
  };
}

function startOfIsoWeek(date: dayjs.Dayjs): dayjs.Dayjs {
  const mondayOffset = (date.day() + 6) % 7;

  return date.clone().subtract(mondayOffset, 'day').startOf('day');
}

function getPeriodBounds(
  period: AdminDashboardPeriod,
  customRange?: {
    start: string,
    end: string,
  },
): PeriodBounds | null {
  if (period === 'custom') {
    if (!customRange) return null;

    return getCustomPeriodBounds(customRange.start, customRange.end);
  }

  const now = dayjs.utc();
  const isoWeekday = now.day();
  const mondayOffset = (isoWeekday + 6) % 7;
  const isoWeekStart = now.clone().subtract(mondayOffset, 'day').startOf('day');

  if (period === 'day') {
    const start = now.clone().startOf('day');
    const end = now;

    return {
      start,
      end,
      ...withPriorWindow(start, end),
      timeseries: {
        start,
        end,
        truncateUnit: 'hour',
        stepUnit: 'hour',
        stepAmount: 1,
        bucketKey: date => date.clone().startOf('hour').format('YYYY-MM-DDTHH:00:00[Z]'),
        label: date => date.format('HH:00'),
      },
    };
  }

  if (period === 'week') {
    const start = isoWeekStart;
    const end = now;

    return {
      start,
      end,
      ...withPriorWindow(start, end),
      timeseries: {
        start,
        end,
        truncateUnit: 'day',
        stepUnit: 'day',
        stepAmount: 1,
        bucketKey: date => date.clone().startOf('day').format('YYYY-MM-DDT00:00:00[Z]'),
        label: date => date.format('ddd'),
      },
    };
  }

  const start = now.clone().startOf('month');
  const end = now;

  return {
    start,
    end,
    ...withPriorWindow(start, end),
    timeseries: {
      start,
      end,
      truncateUnit: 'day',
      stepUnit: 'day',
      stepAmount: 1,
      bucketKey: date => date.clone().startOf('day').format('YYYY-MM-DDT00:00:00[Z]'),
      label: date => date.format('MMM D'),
    },
  };
}

function deltaPct(current: number, prior: number): number | null {
  if (prior === 0) return null;

  return ((current - prior) / prior) * 100;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;

  return numerator / denominator;
}

function buildSignupTimeseries(
  signups: PeriodSignup[],
  config: TimeSeriesBucketConfig,
): AdminDashboardTimeseriesPoint[] {
  const counts = countEventsByBucket({
    config,
    events: signups,
    getDate: signup => signup.creationDate,
  });

  return fillTimeSeries({
    config,
    valuesByBucket: counts,
    emptyValue: 0,
  }).map(point => ({
    date: point.date,
    label: point.label,
    count: point.value,
  }));
}

function sumLeaderboardBonusSparks(
  leaderboards: Array<Pick<InternalLeaderboard, 'prizes' | 'paidUserIDs'>>,
): number {
  let total = 0;

  for (const leaderboard of leaderboards) {
    const paidCount = leaderboard.paidUserIDs?.length ?? 0;
    const prizes = leaderboard.prizes ?? [];

    for (let i = 0; i < paidCount && i < prizes.length; i++) {
      const prize = prizes[i];
      if (typeof prize === 'number' && Number.isFinite(prize)) total += prize;
    }
  }

  return total;
}

export async function getAdminDashboardStatistics(
  {
    period,
    start,
    end,
  }: {
    period: AdminDashboardPeriod,
    start?: string,
    end?: string,
  },
): Promise<FunctionResponse<AdminDashboardStatistics, GetAdminDashboardStatisticsError>> {
  try {
    const customRange = start && end ? { start, end } : undefined;
    const bounds = getPeriodBounds(period, customRange);

    if (!bounds) return { ok: false, error: 'invalidRange' };

    const startDate = bounds.start.toDate();
    const endDate = bounds.end.toDate();
    const priorStartDate = bounds.priorStart.toDate();
    const priorEndDate = bounds.priorEnd.toDate();
    const window = {
      startDate,
      endDate,
      priorStartDate,
      priorEndDate,
    };

    const [
      lifetimeEarnedUsd,
      periodSignups,
      priorSignupsCount,
      earningsFacet,
      redemptionFacet,
      topAffiliateDocs,
      paidLeaderboards,
    ] = await Promise.all([
      fetchLifetimeEarnedUsd(),
      fetchPeriodSignups({ startDate, endDate }),
      fetchSignupCount({ startDate: priorStartDate, endDate: priorEndDate }),
      fetchEarningsDashboardFacet(window),
      fetchCompletedRedemptionTotals(window),
      fetchTopAffiliateCodes(),
      fetchPaidLeaderboardsInWindow({ startDate, endDate }),
    ]);

    const signupIds = periodSignups.map(signup => signup.userID);
    const activeEarnerIds = (earningsFacet?.activeEarners ?? []).map(row => row._id);
    const periodUserUsd = earningsFacet?.periodUserUsd ?? [];
    const periodEarnerIds = periodUserUsd.map(row => row._id);

    const [
      signupGeoRows,
      firstEarnRows,
      cashoutEarnerIds,
      referredEarnerDocs,
    ] = await Promise.all([
      fetchSignupGeoMix({ signupIds }),
      fetchFirstEarnDates({ userIds: signupIds }),
      fetchCashoutEarnerIds({ activeEarnerIds }),
      fetchReferredEarnerMeta({ periodEarnerIds }),
    ]);

    const creationByUserID = new Map(periodSignups.map(signup => [ signup.userID, signup.creationDate ]));
    let activatedUsers = 0;
    let activatedWithin24h = 0;
    let activatedWithin7d = 0;

    for (const row of firstEarnRows) {
      const creationDate = creationByUserID.get(row._id);
      if (!creationDate) continue;

      activatedUsers += 1;
      const delayMs = row.firstAt.getTime() - creationDate.getTime();
      if (delayMs >= 0 && delayMs <= MS_PER_DAY) activatedWithin24h += 1;
      if (delayMs >= 0 && delayMs <= MS_PER_DAY * 7) activatedWithin7d += 1;
    }

    const signups = periodSignups.length;
    const referredSignups = periodSignups.filter(signup => signup.referred).length;
    const organicSignups = signups - referredSignups;

    const geoAssigned = signupGeoRows.reduce((sum, row) => sum + row.count, 0);
    const signupGeo: AdminDashboardGeoBucket[] = signupGeoRows.map(row => ({
      country: row._id || 'unknown',
      count: row.count,
    }));

    if (signups > geoAssigned) {
      const unknownBucket = signupGeo.find(bucket => bucket.country === 'unknown');
      const missing = signups - geoAssigned;

      if (unknownBucket) {
        unknownBucket.count += missing;
      } else {
        signupGeo.push({ country: 'unknown', count: missing });
      }
    }

    signupGeo.sort((a, b) => b.count - a.count);
    if (signupGeo.length > STATS_TOP_N) signupGeo.length = STATS_TOP_N;

    const periodTotals = earningsFacet?.periodTotals[0];
    const priorTotals = earningsFacet?.priorTotals[0];
    const periodEarnedUsd = periodTotals?.earnedUsd ?? 0;
    const priorEarnedUsd = priorTotals?.earnedUsd ?? 0;
    const periodSparksCredited = periodTotals?.sparksCredited ?? 0;
    const priorSparksCredited = priorTotals?.sparksCredited ?? 0;
    const reversedUsd = periodTotals?.reversedUsd ?? 0;

    const activeEarners = activeEarnerIds.length;
    const repeatEarnerCount = earningsFacet?.repeatEarners[0]?.count ?? 0;

    const topProviders: AdminDashboardRankedCount[] = (earningsFacet?.topProviders ?? []).map(row => ({
      id: row._id,
      count: row.count,
      usdValue: row.usdValue,
    }));

    const topOffers: AdminDashboardRankedCount[] = (earningsFacet?.topOffers ?? []).map(row => ({
      id: row._id,
      count: row.count,
      usdValue: row.usdValue,
    }));

    const offerTypeMix: AdminDashboardOfferTypeBucket[] = (earningsFacet?.offerTypeMix ?? []).map(row => ({
      offerType: row._id || 'unknown',
      count: row.count,
      usdValue: row.usdValue,
    }));

    const usdByUserID = new Map(periodUserUsd.map(row => [ row._id, row.usdValue ]));
    const referredUserMeta = new Map(
      referredEarnerDocs.map(doc => [
        doc.userID,
        {
          code: doc.referralInformation?.referredBy ?? '',
        },
      ]),
    );

    let referredEarnedUsd = 0;
    let organicEarnedUsd = 0;
    const periodCodeUsd = new Map<string, number>();

    for (const [ userID, usdValue ] of usdByUserID) {
      const referredMeta = referredUserMeta.get(userID);

      if (referredMeta) {
        referredEarnedUsd += usdValue;
        if (referredMeta.code) {
          periodCodeUsd.set(
            referredMeta.code,
            (periodCodeUsd.get(referredMeta.code) ?? 0) + usdValue,
          );
        }
      } else {
        organicEarnedUsd += usdValue;
      }
    }

    const topAffiliateCodes: AdminDashboardAffiliateCodeRank[] = topAffiliateDocs.map(doc => ({
      code: doc.code,
      totalEarnings: doc.totalEarnings,
      tasksCompleted: doc.tasksCompleted,
      periodEarnedUsd: periodCodeUsd.get(doc.code) ?? 0,
    }));

    // Surface period-hot codes missing from lifetime top list (still no PII).
    const periodHotCodes = [ ...periodCodeUsd.entries() ]
      .sort((a, b) => b[1] - a[1])
      .slice(0, STATS_TOP_N);

    for (const [ code, periodEarnedUsdValue ] of periodHotCodes) {
      if (topAffiliateCodes.some(entry => entry.code === code)) continue;
      if (topAffiliateCodes.length >= STATS_TOP_N) break;

      topAffiliateCodes.push({
        code,
        totalEarnings: 0,
        tasksCompleted: 0,
        periodEarnedUsd: periodEarnedUsdValue,
      });
    }

    const periodRedemptions = redemptionFacet?.period[0];
    const priorRedemptions = redemptionFacet?.prior[0];

    const data: AdminDashboardStatistics = {
      period,
      window: {
        start: startDate,
        end: endDate,
        priorStart: priorStartDate,
        priorEnd: priorEndDate,
      },
      northStar: {
        lifetimeEarnedUsd,
        periodEarnedUsd,
        priorEarnedUsd,
        earnedUsdDeltaPct: deltaPct(periodEarnedUsd, priorEarnedUsd),
        periodSparksCredited,
        priorSparksCredited,
        signups,
        priorSignups: priorSignupsCount,
        signupsDeltaPct: deltaPct(signups, priorSignupsCount),
      },
      acquisition: {
        signupTimeseries: buildSignupTimeseries(periodSignups, bounds.timeseries),
        referredSignupPct: ratio(referredSignups, signups),
        signupGeo,
      },
      activation: {
        activatedUsers,
        activationRate: ratio(activatedUsers, signups),
        activatedWithin24hRate: ratio(activatedWithin24h, signups),
        activatedWithin7dRate: ratio(activatedWithin7d, signups),
      },
      engagement: {
        activeEarners,
        topProviders,
        topOffers,
        offerTypeMix,
        repeatEarnerRate: ratio(repeatEarnerCount, activeEarners),
      },
      virality: {
        referredSignups,
        organicSignups,
        referredEarnedUsd,
        organicEarnedUsd,
        topAffiliateCodes,
      },
      monetization: {
        completedCashouts: periodRedemptions?.count ?? 0,
        completedCashoutUsd: periodRedemptions?.usdValue ?? 0,
        priorCompletedCashouts: priorRedemptions?.count ?? 0,
        priorCompletedCashoutUsd: priorRedemptions?.usdValue ?? 0,
        cashoutRate: ratio(cashoutEarnerIds.length, activeEarners),
        reversalDrag: ratio(reversedUsd, periodEarnedUsd),
        leaderboardBonusSparks: sumLeaderboardBonusSparks(paidLeaderboards),
      },
    };

    return { ok: true, data };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}
