import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';
import type { HomepageOffersResponse } from 'types/HomepageOffersResponse';

type RequestFn = typeof clientRequest | typeof serverRequest;

function isHomepagePayload(
  value: HomepageOffersResponse | null | undefined,
): value is HomepageOffersResponse {
  if (!value) return false;

  return (
    Array.isArray(value.featured)
    && Array.isArray(value.popular)
    && Array.isArray(value.game)
    && Array.isArray(value.finance)
    && Array.isArray(value.surveys)
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
