export type CpxSurvey = {
  id: string,
  loi: string,
  payout: number,
  conversion_rate: string,
  score?: string,
  quality_score?: number | string,
  statistics_rating_count: string,
  statistics_rating_avg: string,
  type: string,
  top: number,
  details: number,
  payout_publisher_usd: string,
  href: string,
  href_new?: string,
  webcam?: number,
};

export type CpxSurveysResponse = {
  status: string,
  count_available_surveys: number,
  count_returned_surveys: number,
  surveys: CpxSurvey[],
};
