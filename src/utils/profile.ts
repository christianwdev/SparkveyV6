import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';
import type APIResponse from 'types/APIResponse';
import type InternalEarning from 'types/Earnings/InternalEarning';
import type { InternalEarningStatus } from 'types/Earnings/InternalEarning';
import type InternalRedemption from 'types/Redemption/InternalRedemption';
import type {
  InternalRedemptionProvider,
  InternalRedemptionStatus,
} from 'types/Redemption/BaseInternalRedemption';
import type SanitizedUserSession from 'types/SanitizedUserSession';

type RequestFn = typeof clientRequest | typeof serverRequest;

export const PROFILE_HISTORY_PAGE_SIZE = 10;

type EarningsHistoryParams = {
  request: RequestFn;
  page?: number;
  status?: InternalEarningStatus;
  type?: InternalEarning['type'];
};

type RedemptionsHistoryParams = {
  request: RequestFn;
  page?: number;
  status?: InternalRedemptionStatus;
  type?: InternalRedemptionProvider;
};

export async function getEarningsHistory(
  {
    request,
    page = 1,
    status,
    type,
  }: EarningsHistoryParams,
): Promise<InternalEarning[] | null> {
  try {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    if (type) params.set('type', type);

    const response = await request<APIResponse<InternalEarning[]>>({
      url: `${getScope()}/profile/history/earnings/history?${params.toString()}`,
      credentials: 'include',
    });

    if (!response.data?.success) return null;

    return response.data.data ?? [];
  } catch {
    return null;
  }
}

export async function getRedemptionsHistory(
  {
    request,
    page = 1,
    status,
    type,
  }: RedemptionsHistoryParams,
): Promise<InternalRedemption[] | null> {
  try {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    if (type) params.set('type', type);

    const response = await request<APIResponse<InternalRedemption[]>>({
      url: `${getScope()}/profile/history/redemptions/history?${params.toString()}`,
      credentials: 'include',
    });

    if (!response.data?.success) return null;

    return response.data.data ?? [];
  } catch {
    return null;
  }
}

export async function getSessions(
  {
    request,
  }: {
    request: RequestFn,
  },
): Promise<SanitizedUserSession[] | null> {
  try {
    const response = await request<APIResponse<SanitizedUserSession[]>>({
      url: `${getScope()}/profile/sessions`,
      credentials: 'include',
    });

    if (!response.data?.success) return null;

    return response.data.data ?? [];
  } catch {
    return null;
  }
}

export async function revokeSession(
  {
    request,
    sessionID,
  }: {
    request: RequestFn,
    sessionID: string,
  },
): Promise<boolean> {
  try {
    const response = await request<APIResponse<null>>({
      url: `${getScope()}/profile/sessions/${encodeURIComponent(sessionID)}`,
      method: 'DELETE',
      credentials: 'include',
    });

    return !!response.data?.success;
  } catch {
    return false;
  }
}
