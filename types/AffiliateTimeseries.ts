type AffiliatePeriod = 'day' | 'week' | 'month' | 'year';

type AffiliateTimeseriesPoint = {
  date: string,
  totalEarnings: number,
};

export type { AffiliatePeriod, AffiliateTimeseriesPoint };
export default AffiliateTimeseriesPoint;
