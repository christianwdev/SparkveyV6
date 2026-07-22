import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';
import type { HomepageOffersResponse } from 'types/HomepageOffersResponse';

type RequestFn = typeof clientRequest | typeof serverRequest;

function isHomepagePayload(value: unknown): value is HomepageOffersResponse {
  if (!value || typeof value !== 'object') return false;

  const payload = value as Partial<HomepageOffersResponse>;

  return (
    Array.isArray(payload.featured)
    && Array.isArray(payload.popular)
    && Array.isArray(payload.game)
    && Array.isArray(payload.finance)
    && Array.isArray(payload.surveys)
  );
}

export function homepageHasOffers(homepage: HomepageOffersResponse) {
  return (
    homepage.featured.length > 0
    || homepage.popular.length > 0
    || homepage.game.length > 0
    || homepage.finance.length > 0
  );
}

export async function getUsersHomepage(
  { request }: { request: RequestFn },
): Promise<HomepageOffersResponse | null> {
  try {
    const response = await request<HomepageOffersResponse>({
      url: `${getScope()}/offers/homepage`,
      credentials: 'include',
    });

    if (!isHomepagePayload(response.data)) return null;

    return response.data;
  } catch {
    return null;
  }
}
