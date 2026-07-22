import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';
import type APIResponse from 'types/APIResponse';
import type InternalOffer from 'types/Offer/InternalOffer';
import {
  DEFAULT_BROWSE_OFFERS_SORT,
  type BrowseOffersSort,
} from 'types/Offer/BrowseOffersSort';

type RequestFn = typeof clientRequest | typeof serverRequest;

export type { BrowseOffersSort };

export type BrowseOffersParams = {
  limit?: number;
  skip?: number;
  sort?: BrowseOffersSort;
  search?: string;
  categories?: string[];
  providers?: string[];
};

export async function browseOffers(
  {
    request,
    ...params
  }: BrowseOffersParams & {
    request: RequestFn;
  },
): Promise<InternalOffer[] | null> {
  try {
    const response = await request<APIResponse<InternalOffer[]>>({
      url: `${getScope()}/offers/browse`,
      method: 'POST',
      credentials: 'include',
      data: {
        limit: params.limit ?? 28,
        skip: params.skip ?? 0,
        sort: params.sort ?? DEFAULT_BROWSE_OFFERS_SORT,
        search: params.search || undefined,
        categories: params.categories ?? [],
        providers: params.providers ?? [],
      },
    });

    if (!response.data?.success) return null;

    return response.data.data ?? [];
  } catch {
    return null;
  }
}
