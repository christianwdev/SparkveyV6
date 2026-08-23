import { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type {
  AdminOfferDetail,
  AdminOfferListItem,
  AdminOfferSearchBy,
  AdminOfferSortBy,
  AdminOfferStatus,
} from 'types/AdminOffer';
import type { AdminMutationResult } from '@utils/adminUsers';

type RequestFn = typeof clientRequest | typeof serverRequest;

export const ADMIN_OFFERS_PAGE_SIZE = 10;

function adminOffersUrl(path: string, params?: URLSearchParams): string {
  const suffix = path === '/' ? '' : path;
  const query = params?.toString();

  return query
    ? `${getScope()}/admin/offers${suffix}?${query}`
    : `${getScope()}/admin/offers${suffix}`;
}

export async function fetchAdminOffers(
  {
    request,
    status,
    searchBy = 'name',
    search = '',
    sortBy = 'totalReward',
    sortDirection = 'desc',
    page = 1,
    limit = ADMIN_OFFERS_PAGE_SIZE,
  }: {
    request: RequestFn,
    status?: AdminOfferStatus,
    searchBy?: AdminOfferSearchBy,
    search?: string,
    sortBy?: AdminOfferSortBy,
    sortDirection?: 'asc' | 'desc',
    page?: number,
    limit?: number,
  },
): Promise<AdminOfferListItem[] | null> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
      searchBy,
      sortBy,
      sortDirection,
    });

    if (status) params.set('status', status);
    if (search.trim()) params.set('search', search.trim());

    const response = await request<APIResponse<AdminOfferListItem[]>>({
      url: adminOffersUrl('', params),
      credentials: 'include',
    });

    if (!response.data?.success || response.data.data === undefined) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function fetchAdminOffer(
  {
    request,
    offerID,
  }: {
    request: RequestFn,
    offerID: string,
  },
): Promise<AdminOfferDetail | null> {
  try {
    const response = await request<APIResponse<AdminOfferDetail>>({
      url: adminOffersUrl(`/${encodeURIComponent(offerID)}`),
      credentials: 'include',
    });

    if (!response.data?.success || !response.data.data) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function createAdminOfferRequest(
  body: {
    name: string,
    displayName?: string,
    description: string,
    image: string,
    trackingURL: string,
    rewards: Array<{
      externalID?: string,
      description?: string,
      value: number | 'variable',
      revenue?: number | 'variable',
    }>,
    geos?: string[],
    geosBlacklist?: string[],
    status?: AdminOfferStatus,
    terms?: string,
    disclaimer?: string,
    featuredPriority?: number,
  },
): Promise<AdminMutationResult<AdminOfferDetail>> {
  try {
    const response = await clientRequest<APIResponse<AdminOfferDetail>>({
      url: adminOffersUrl(''),
      method: 'POST',
      credentials: 'include',
      data: body,
    });

    return {
      success: !!response.data?.success,
      data: response.data?.data,
      code: response.data?.code,
      message: response.data?.message,
    };
  } catch {
    return { success: false };
  }
}

export async function updateAdminOfferRequest(
  body: {
    offerID: string,
    displayName?: string,
    description?: string,
    terms?: string,
    disclaimer?: string,
    featuredPriority?: number | null,
    status?: AdminOfferStatus,
    geos?: string[],
    geosBlacklist?: string[],
    image?: string,
    trackingURL?: string,
    rewards?: Array<{
      rewardID: string,
      value?: number | 'variable',
      description?: string,
    }>,
  },
): Promise<AdminMutationResult<AdminOfferDetail>> {
  try {
    const response = await clientRequest<APIResponse<AdminOfferDetail>>({
      url: adminOffersUrl('/update'),
      method: 'POST',
      credentials: 'include',
      data: body,
    });

    return {
      success: !!response.data?.success,
      data: response.data?.data,
      code: response.data?.code,
      message: response.data?.message,
    };
  } catch {
    return { success: false };
  }
}
