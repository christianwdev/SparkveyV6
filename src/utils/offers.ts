import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type SanitizedOffer from 'types/Offer/SanitizedOffer';
import type OfferCompletionStep from 'types/Offer/OfferCompletionStep';
import {
  DEFAULT_BROWSE_OFFERS_SORT,
  type BrowseOffersSort,
} from 'types/Offer/BrowseOffersSort';

type RequestFn = typeof clientRequest | typeof serverRequest;

export const BROWSE_OFFERS_PAGE_SIZE = 40;

export type { BrowseOffersSort };

export type BrowseOffersParams = {
  limit?: number;
  skip?: number;
  sort?: BrowseOffersSort;
  search?: string;
  categories?: string[];
  providers?: string[];
};

export type OfferDetailsPayload = {
  offer: SanitizedOffer,
  completion: OfferCompletionStep[],
};

export async function browseOffers(
  {
    request,
    ...params
  }: BrowseOffersParams & {
    request: RequestFn;
  },
): Promise<SanitizedOffer[] | null> {
  try {
    const response = await request<APIResponse<SanitizedOffer[]>>({
      url: `${getScope()}/offers/browse`,
      method: 'POST',
      credentials: 'include',
      data: {
        limit: params.limit ?? BROWSE_OFFERS_PAGE_SIZE,
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

export async function getOfferDetails(
  {
    request,
    offerID,
  }: {
    request: RequestFn,
    offerID: string,
  },
): Promise<OfferDetailsPayload | null> {
  try {
    const response = await request<APIResponse<OfferDetailsPayload>>({
      url: `${getScope()}/offers/${encodeURIComponent(offerID)}`,
      credentials: 'include',
    });

    if (!response.data?.success || !response.data.data) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export function getOfferRedirectURL(offerID: string) {
  return `${getScope()}/offers/redirect/${encodeURIComponent(offerID)}`;
}
