import type { clientRequest } from '@utils/clientRequest';
import type { LandingHomepageResponse } from 'types/LandingHomepageResponse';

type RequestFn = typeof clientRequest;

const emptyHomepage: LandingHomepageResponse = {
  totalEarned: 0,
  popularOffers: [],
  liveActivity: [],
};

export async function getHomepage(
  { request }: { request: RequestFn },
): Promise<LandingHomepageResponse> {
  try {
    const response = await request({ url: '/landing/homepage' });

    if (!response.ok) {
      return emptyHomepage;
    }

    return await response.json() as LandingHomepageResponse;
  } catch {
    return emptyHomepage;
  }
}

export async function getSiteStatistics(
  { request }: { request: RequestFn },
): Promise<number> {
  try {
    const response = await request({ url: '/landing/statistics' });

    if (!response.ok) {
      return 0;
    }

    const data = await response.json() as { usdEarned?: number };

    return data.usdEarned ?? 0;
  } catch {
    return 0;
  }
}

const landingUtils = {
  getHomepage,
  getSiteStatistics,
};

export default landingUtils;
