import { clientRequest } from '@utils/clientRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type InternalPromocode from 'types/InternalPromocode';
import type { AdminMutationResult } from '@utils/adminUsers';

export const ADMIN_PROMOCODES_PAGE_SIZE = 10;

export type AdminPromocodeList = {
  promocodes: InternalPromocode[],
  total: number,
};

function adminPromocodesUrl(path: string, params?: URLSearchParams): string {
  const suffix = path === '/' ? '' : path;
  const query = params?.toString();

  return query
    ? `${getScope()}/admin/promocodes${suffix}?${query}`
    : `${getScope()}/admin/promocodes${suffix}`;
}

export async function fetchAdminPromocodes(
  {
    page = 1,
    limit = ADMIN_PROMOCODES_PAGE_SIZE,
  }: {
    page?: number,
    limit?: number,
  } = {},
): Promise<AdminPromocodeList | null> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
    });

    const response = await clientRequest<APIResponse<AdminPromocodeList>>({
      url: adminPromocodesUrl('', params),
      credentials: 'include',
    });

    if (!response.data?.success || response.data.data === undefined) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function createAdminPromocodeRequest(
  {
    code,
    rewardValue,
    totalUses,
    expiryDate,
  }: {
    code: string,
    rewardValue: number,
    totalUses: number,
    expiryDate: string,
  },
): Promise<AdminMutationResult<InternalPromocode>> {
  try {
    const response = await clientRequest<APIResponse<InternalPromocode>>({
      url: adminPromocodesUrl('/'),
      method: 'POST',
      credentials: 'include',
      data: {
        code,
        rewardValue,
        totalUses,
        expiryDate,
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

export async function deleteAdminPromocodeRequest(
  {
    code,
  }: {
    code: string,
  },
): Promise<AdminMutationResult<{ code: string }>> {
  try {
    const response = await clientRequest<APIResponse<{ code: string }>>({
      url: adminPromocodesUrl('/delete'),
      method: 'POST',
      credentials: 'include',
      data: {
        code,
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
