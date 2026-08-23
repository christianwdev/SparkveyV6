import { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type { AdminPostbackRow, AdminPostbackSearchBy, AdminPostbackStatus } from 'types/AdminPostback';
import type { AdminMutationResult } from '@utils/adminUsers';

type RequestFn = typeof clientRequest | typeof serverRequest;

export const ADMIN_POSTBACKS_PAGE_SIZE = 10;

function adminPostbacksUrl(path: string, params?: URLSearchParams): string {
  const suffix = path === '/' ? '' : path;
  const query = params?.toString();

  return query
    ? `${getScope()}/admin/postbacks${suffix}?${query}`
    : `${getScope()}/admin/postbacks${suffix}`;
}

export async function fetchAdminPostbacks(
  {
    request,
    statuses = [],
    searchBy = 'requestID',
    search = '',
    page = 1,
    limit = ADMIN_POSTBACKS_PAGE_SIZE,
  }: {
    request: RequestFn,
    statuses?: AdminPostbackStatus[],
    searchBy?: AdminPostbackSearchBy,
    search?: string,
    page?: number,
    limit?: number,
  },
): Promise<AdminPostbackRow[] | null> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
      searchBy,
    });

    if (statuses.length > 0) params.set('status', statuses.join(','));
    if (search.trim()) params.set('search', search.trim());

    const response = await request<APIResponse<AdminPostbackRow[]>>({
      url: adminPostbacksUrl('', params),
      credentials: 'include',
    });

    if (!response.data?.success || response.data.data === undefined) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function retryAdminPostbackRequest(
  {
    requestID,
  }: {
    requestID: string,
  },
): Promise<AdminMutationResult<{ retryCount: number }>> {
  try {
    const response = await clientRequest<APIResponse<{ retryCount: number }>>({
      url: adminPostbacksUrl('/retry'),
      method: 'POST',
      credentials: 'include',
      data: {
        requestID,
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
