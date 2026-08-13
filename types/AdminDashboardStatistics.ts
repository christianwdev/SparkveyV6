type AdminDashboardPeriod = 'day' | 'week' | 'month' | 'custom';

type AdminDashboardTimeseriesPoint = {
  date: string,
  label: string,
  count: number,
};

type AdminDashboardGeoBucket = {
  country: string,
  count: number,
};

type AdminDashboardRankedCount = {
  id: string,
  name?: string,
  count: number,
  usdValue: number,
};

type AdminDashboardAffiliateCodeRank = {
  code: string,
  totalEarnings: number,
  tasksCompleted: number,
  periodEarnedUsd: number,
};

type AdminDashboardOfferTypeBucket = {
  offerType: string,
  count: number,
  usdValue: number,
};

type AdminDashboardWindow = {
  start: Date,
  end: Date,
  priorStart: Date,
  priorEnd: Date,
};

type AdminDashboardStatistics = {
  period: AdminDashboardPeriod,
  window: AdminDashboardWindow,

  northStar: {
    lifetimeEarnedUsd: number,
    periodEarnedUsd: number,
    priorEarnedUsd: number,
    earnedUsdDeltaPct: number | null,
    periodSparksCredited: number,
    priorSparksCredited: number,
    signups: number,
    priorSignups: number,
    signupsDeltaPct: number | null,
  },

  acquisition: {
    signupTimeseries: AdminDashboardTimeseriesPoint[],
    earnedTimeseries: AdminDashboardTimeseriesPoint[],
    referredSignupPct: number | null,
    signupGeo: AdminDashboardGeoBucket[],
  },

  activation: {
    activatedUsers: number,
    activationRate: number | null,
    activatedWithin24hRate: number | null,
    activatedWithin7dRate: number | null,
  },

  engagement: {
    activeEarners: number,
    topProviders: AdminDashboardRankedCount[],
    topOffers: AdminDashboardRankedCount[],
    offerTypeMix: AdminDashboardOfferTypeBucket[],
    repeatEarnerRate: number | null,
  },

  virality: {
    referredSignups: number,
    organicSignups: number,
    referredEarnedUsd: number,
    organicEarnedUsd: number,
    topAffiliateCodes: AdminDashboardAffiliateCodeRank[],
  },

  monetization: {
    completedCashouts: number,
    completedCashoutUsd: number,
    priorCompletedCashouts: number,
    priorCompletedCashoutUsd: number,
    cashoutRate: number | null,
    reversedUsd: number,
    reversedCount: number,
    reversalDrag: number | null,
    leaderboardBonusSparks: number,
  },
};

export type {
  AdminDashboardPeriod,
  AdminDashboardTimeseriesPoint,
  AdminDashboardGeoBucket,
  AdminDashboardRankedCount,
  AdminDashboardAffiliateCodeRank,
  AdminDashboardOfferTypeBucket,
  AdminDashboardWindow,
};

export default AdminDashboardStatistics;
