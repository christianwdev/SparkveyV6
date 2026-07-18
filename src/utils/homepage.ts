import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';
import type { HomepageOffersResponse } from 'types/HomepageOffersResponse';

type RequestFn = typeof clientRequest | typeof serverRequest;

export async function getUsersHomepage(
  { request }: { request: RequestFn },
): Promise<HomepageOffersResponse | null> {
  try {
    const response = await request<HomepageOffersResponse>({ url: `${getScope()}/offers/homepage` });

    return response.data ?? null;
  } catch {
    return null;
  }
}