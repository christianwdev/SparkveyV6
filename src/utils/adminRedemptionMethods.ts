import { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type {
  AdminRedemptionMethodDetail,
  AdminRedemptionMethodListItem,
  AdminRedemptionMethodSearchBy,
  AdminRedemptionMethodStatus,
} from 'types/AdminRedemptionMethod';
import type RedeemCategoryID from 'types/Reward/RedeemCategoryID';
import type { AdminMutationResult } from '@utils/adminUsers';

type RequestFn = typeof clientRequest | typeof serverRequest;

export const ADMIN_REDEMPTION_METHODS_PAGE_SIZE = 10;

function adminRedemptionMethodsUrl(path: string, params?: URLSearchParams): string {
  const suffix = path === '/' ? '' : path;
  const query = params?.toString();

  return query
    ? `${getScope()}/admin/redemption-methods${suffix}?${query}`
    : `${getScope()}/admin/redemption-methods${suffix}`;
}

export async function fetchAdminRedemptionMethods(
  {
    request,
    status,
    searchBy = 'name',
    search = '',
    sortDirection = 'asc',
    page = 1,
    limit = ADMIN_REDEMPTION_METHODS_PAGE_SIZE,
  }: {
    request: RequestFn,
    status?: AdminRedemptionMethodStatus,
    searchBy?: AdminRedemptionMethodSearchBy,
    search?: string,
    sortDirection?: 'asc' | 'desc',
    page?: number,
    limit?: number,
  },
): Promise<AdminRedemptionMethodListItem[] | null> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
      searchBy,
      sortDirection,
    });

    if (status) params.set('status', status);
    if (search.trim()) params.set('search', search.trim());

    const response = await request<APIResponse<AdminRedemptionMethodListItem[]>>({
      url: adminRedemptionMethodsUrl('', params),
      credentials: 'include',
    });

    if (!response.data?.success || response.data.data === undefined) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function fetchAdminRedemptionMethod(
  {
    request,
    rewardID,
  }: {
    request: RequestFn,
    rewardID: string,
  },
): Promise<AdminRedemptionMethodDetail | null> {
  try {
    const response = await request<APIResponse<AdminRedemptionMethodDetail>>({
      url: adminRedemptionMethodsUrl(`/${encodeURIComponent(rewardID)}`),
      credentials: 'include',
    });

    if (!response.data?.success || !response.data.data) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function updateAdminRedemptionMethodRequest(
  body: {
    rewardID: string,
    status?: AdminRedemptionMethodStatus,
    featuredSpot?: number | null,
    categories?: RedeemCategoryID[],
    internalImage?: {
      src: string,
      type: 'logo' | 'card',
    } | null,
  },
): Promise<AdminMutationResult<AdminRedemptionMethodDetail>> {
  try {
    const response = await clientRequest<APIResponse<AdminRedemptionMethodDetail>>({
      url: adminRedemptionMethodsUrl('/update'),
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
