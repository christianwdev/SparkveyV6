import { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type { AdminEarningRow, AdminEarningSearchBy } from 'types/AdminEarning';
import type { InternalEarningStatus } from 'types/Earnings/InternalEarning';
import type { AdminMutationResult } from '@utils/adminUsers';

type RequestFn = typeof clientRequest | typeof serverRequest;

export const ADMIN_EARNINGS_PAGE_SIZE = 10;

function adminEarningsUrl(path: string, params?: URLSearchParams): string {
  const suffix = path === '/' ? '' : path;
  const query = params?.toString();

  return query
    ? `${getScope()}/admin/earnings${suffix}?${query}`
    : `${getScope()}/admin/earnings${suffix}`;
}

export async function fetchAdminEarnings(
  {
    request,
    statuses = [],
    searchBy = 'userID',
    search = '',
    page = 1,
    limit = ADMIN_EARNINGS_PAGE_SIZE,
  }: {
    request: RequestFn,
    statuses?: InternalEarningStatus[],
    searchBy?: AdminEarningSearchBy,
    search?: string,
    page?: number,
    limit?: number,
  },
): Promise<AdminEarningRow[] | null> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
      searchBy,
    });

    if (statuses.length > 0) params.set('status', statuses.join(','));
    if (search.trim()) params.set('search', search.trim());

    const response = await request<APIResponse<AdminEarningRow[]>>({
      url: adminEarningsUrl('', params),
      credentials: 'include',
    });

    if (!response.data?.success || response.data.data === undefined) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function releaseAdminEarningRequest(
  {
    provider,
    conversionID,
  }: {
    provider: string,
    conversionID: string,
  },
): Promise<AdminMutationResult<unknown>> {
  try {
    const response = await clientRequest<APIResponse<unknown>>({
      url: adminEarningsUrl('/release'),
      method: 'POST',
      credentials: 'include',
      data: {
        provider,
        conversionID,
      },
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
