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

function normalizeSurvey(survey: CpxSurvey): SanitizedCPXSurvey {
  const payout = Number(survey.payout) || 0;

  return {
    id: String(survey.id),
    loiMinutes: Number(survey.loi) || 0,
    sparks: Math.round(payout * SPARKS_PER_USD),
    score: survey.score !== undefined
      ? Number(survey.score)
      : survey.quality_score !== undefined
        ? Number(survey.quality_score)
        : null,
    ratingAverage: Number(survey.statistics_rating_avg) || 0,
    type: survey.type,
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

  if (!user.personalInformation.completedAt) {
    return { ok: true, data: [] };
  }

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

  const email = user.emailInformation.emailAddress;
  if (email) params.set('email', email);

  if (user.personalInformation.completedAt) {
    const { dateOfBirth, gender, country, zipCode } = user.personalInformation;

    params.set('main_info', 'true');
    params.set('birthday_day', String(dateOfBirth.getUTCDate()));
    params.set('birthday_month', String(dateOfBirth.getUTCMonth() + 1));
    params.set('birthday_year', String(dateOfBirth.getUTCFullYear()));
    params.set('gender', gender === 'male' ? 'm' : 'f');
    params.set('user_country_code', country.toUpperCase());
    params.set('zip_code', zipCode);
  }

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
      data: payload.surveys.map(normalizeSurvey),
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[cpxresearch] Failed to fetch surveys', error);
    }

    return { ok: false, error: 'upstreamError' };
  }
}
