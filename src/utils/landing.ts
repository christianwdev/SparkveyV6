import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';
import type { LandingHomepageResponse } from 'types/LandingHomepageResponse';

type RequestFn = typeof clientRequest | typeof serverRequest;

const emptyHomepage: LandingHomepageResponse = {
  totalEarned: 0,
  popularOffers: [],
  liveActivity: [],
};

export async function getHomepage(
  { request }: { request: RequestFn },
): Promise<LandingHomepageResponse> {
  try {
    const response = await request<LandingHomepageResponse>({ url: `${getScope()}/landing/homepage` });

    return response.data ?? emptyHomepage;
  } catch {
    return emptyHomepage;
  }
}

export async function getSiteStatistics(
  { request }: { request: RequestFn },
): Promise<number> {
  try {
    const response = await request<{ usdEarned?: number }>({ url: `${getScope()}/landing/statistics` });

    return response.data.usdEarned ?? 0;
  } catch {
    return 0;
  }
}