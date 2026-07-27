import { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type AffiliateCode from 'types/AffiliateCode';

type RequestFn = typeof clientRequest | typeof serverRequest;

export type AffiliateStats = {
  totalReferrals: number,
  totalEarnings: number,
  pendingEarnings: number,
  maxAffiliateCodes: number,
};

export type AffiliatePageData = {
  codes: AffiliateCode[],
  stats: AffiliateStats,
};

export async function fetchAffiliateData(
  {
    request,
  }: {
    request: RequestFn,
  },
): Promise<AffiliatePageData | null> {
  try {
    const response = await request<APIResponse<AffiliatePageData>>({
      url: `${getScope()}/affiliates`,
      credentials: 'include',
    });

    if (!response.data?.success || !response.data.data) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function createAffiliateCode(
  {
    code,
  }: {
    code: string,
  },
): Promise<APIResponse<AffiliateCode> | null> {
  try {
    const response = await clientRequest<APIResponse<AffiliateCode>>({
      url: `${getScope()}/affiliates/create`,
      method: 'POST',
      credentials: 'include',
      data: { code },
    });

    return response.data ?? null;
  } catch {
    return null;
  }
}

export async function useAffiliateCode(
  {
    code,
  }: {
    code: string,
  },
): Promise<APIResponse<null> | null> {
  try {
    const response = await clientRequest<APIResponse<null>>({
      url: `${getScope()}/affiliates/use`,
      method: 'POST',
      credentials: 'include',
      data: { code },
    });

    return response.data ?? null;
  } catch {
    return null;
  }
}

export async function claimReferralEarnings(): Promise<APIResponse<{ sparks: number }> | null> {
  try {
    const response = await clientRequest<APIResponse<{ sparks: number }>>({
      url: `${getScope()}/affiliates/claim`,
      method: 'POST',
      credentials: 'include',
      data: {},
    });

    return response.data ?? null;
  } catch {
    return null;
  }
}
