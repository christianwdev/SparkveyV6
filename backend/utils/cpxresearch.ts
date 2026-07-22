import { createHash } from 'crypto';

import SiteConfig from 'backend/config/config';
import { SPARKS_PER_USD } from 'backend/utils/rewards';

import type InternalUser from 'types/User/InternalUser';
import type { CpxSurvey, CpxSurveysResponse } from 'types/CPX/CpxSurveysResponse';
import type SanitizedCPXSurvey from 'types/CPX/SanitizedCPXSurvey';
import type FunctionResponse from 'types/FunctionResponse';

export type SurveyProfilerFields = {
  birthdayDay?: number,
  birthdayMonth?: number,
  birthdayYear?: number,
  gender?: 'm' | 'f',
  countryCode?: string,
  zipCode?: string,
};

export function buildCpxSecureHash(extUserId: string, secureHashSecret: string): string {
  return createHash('md5').update(`${extUserId}-${secureHashSecret}`).digest('hex');
}

function computeRecommended(survey: CpxSurvey): number {
  const isTop = Number(survey.top) === 1;
  const rating = Math.min(Math.max(Number(survey.statistics_rating_avg) || 0, 0), 5);
  const conversionRate = Math.min(Math.max(Number(survey.conversion_rate) || 0, 0), 100);
  const payout = Math.max(Number(survey.payout) || 0, 0);

  const topScore = isTop ? 25 : 0;
  const ratingScore = (rating / 5) * 20;
  const conversionScore = (conversionRate / 100) * 35;
  const payoutScore = (Math.min(payout, 5) / 5) * 20;

  return Math.round(topScore + ratingScore + conversionScore + payoutScore);
}

function compareSurveys(a: CpxSurvey, b: CpxSurvey): number {
  const topDiff = Number(b.top) - Number(a.top);
  if (topDiff !== 0) return topDiff;

  const ratingDiff = (Number(b.statistics_rating_avg) || 0) - (Number(a.statistics_rating_avg) || 0);
  if (ratingDiff !== 0) return ratingDiff;

  const conversionDiff = (Number(b.conversion_rate) || 0) - (Number(a.conversion_rate) || 0);
  if (conversionDiff !== 0) return conversionDiff;

  return (Number(b.payout) || 0) - (Number(a.payout) || 0);
}

function normalizeSurvey(survey: CpxSurvey): SanitizedCPXSurvey {
  const payout = Number(survey.payout) || 0;

  return {
    id: String(survey.id),
    loiMinutes: Number(survey.loi) || 0,
    sparks: Math.round(payout / 100 * SPARKS_PER_USD),
    recommended: computeRecommended(survey),
    ratingAvg: Math.min(Math.max(Number(survey.statistics_rating_avg) || 0, 0), 5),
    isTop: Number(survey.top) === 1,
    requiresWebcam: Number(survey.webcam) === 1,
  };
}

export async function fetchCpxSurveys({
  user,
  ipUser,
  userAgent,
  limit,
  subid1,
  subid2,
}: {
  user: InternalUser,
  ipUser: string,
  userAgent?: string,
  limit?: number,
  fallbackCountry?: string,
  subid1?: string,
  subid2?: string,
}): Promise<FunctionResponse<SanitizedCPXSurvey[], 'notConfigured' | 'missingIp' | 'upstreamError' | 'invalidResponse'>> {
  const { appId, secureHash, endpoint, defaultLimit } = SiteConfig.surveys.cpxresearch;

  if (!appId || !secureHash) {
    return { ok: false, error: 'notConfigured' };
  }

  if (!ipUser) {
    return { ok: false, error: 'missingIp' };
  }

  const extUserId = user.userID;
  const surveyLimit = Math.min(Math.max(limit ?? defaultLimit, 1), 50);

  const params = new URLSearchParams({
    app_id: appId,
    ext_user_id: extUserId,
    output_method: 'api',
    ip_user: ipUser,
    limit: String(surveyLimit),
    secure_hash: buildCpxSecureHash(extUserId, secureHash),
  });

  if (subid1) params.set('subid_1', subid1);
  if (subid2) params.set('subid_2', subid2);
  if (userAgent) params.set('user_agent', userAgent);

  // Email is optional for matching; only forward when profiler demographics are absent.
  if (!user.personalInformation.completedAt) {
    const email = user.emailInformation.emailAddress;
    if (email) params.set('email', email);
  }

  if (user.personalInformation.completedAt) {
    const { dateOfBirth, gender, country, zipCode } = user.personalInformation;

    // Only forward fields CPX supports. Never invent gender for "other".
    params.set('main_info', 'true');
    params.set('birthday_day', String(dateOfBirth.getUTCDate()));
    params.set('birthday_month', String(dateOfBirth.getUTCMonth() + 1));
    params.set('birthday_year', String(dateOfBirth.getUTCFullYear()));
    if (gender === 'male' || gender === 'female') {
      params.set('gender', gender === 'male' ? 'm' : 'f');
    }
    params.set('user_country_code', country.toUpperCase());
    params.set('zip_code', zipCode);
  }

  // CPX's surveys endpoint is GET-only; keep query params minimal above.
  try {
    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      return { ok: false, error: 'upstreamError' };
    }

    const payload = await response.json() as CpxSurveysResponse;

    if (payload.status !== 'success' || !Array.isArray(payload.surveys)) {
      return { ok: false, error: 'invalidResponse' };
    }

    return {
      ok: true,
      data: [ ...payload.surveys ].sort(compareSurveys).map(normalizeSurvey),
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[cpxresearch] Failed to fetch surveys', error);
    }

    return { ok: false, error: 'upstreamError' };
  }
}
