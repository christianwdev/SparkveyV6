import { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type {
  AdminUserRiskProfile,
  AdminWithdrawalAttestationRequired,
  AdminWithdrawalBatchResult,
  AdminWithdrawalRow,
} from 'types/AdminWithdrawal';
import type {
  InternalRedemptionProvider,
  InternalRedemptionStatus,
} from 'types/Redemption/BaseInternalRedemption';
import type UserFlag from 'types/UserFlag';
import type { AdminMutationResult } from '@utils/adminUsers';

type RequestFn = typeof clientRequest | typeof serverRequest;

export const ADMIN_WITHDRAWALS_PAGE_SIZE = 20;

function adminWithdrawalsUrl(path: string, params?: URLSearchParams): string {
  const query = params?.toString();

  return query
    ? `${getScope()}/admin/withdrawals${path}?${query}`
    : `${getScope()}/admin/withdrawals${path}`;
}

function adminUsersUrl(path: string): string {
  return `${getScope()}/admin/users${path}`;
}

export async function fetchAdminWithdrawals(
  {
    request,
    status = 'pending',
    provider,
    page = 1,
    limit = ADMIN_WITHDRAWALS_PAGE_SIZE,
  }: {
    request: RequestFn,
    status?: InternalRedemptionStatus,
    provider?: InternalRedemptionProvider,
    page?: number,
    limit?: number,
  },
): Promise<AdminWithdrawalRow[] | null> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
      status,
    });

    if (provider) params.set('provider', provider);

    const response = await request<APIResponse<AdminWithdrawalRow[]>>({
      url: adminWithdrawalsUrl('/', params),
      credentials: 'include',
    });

    if (!response.data?.success || response.data.data === undefined) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function fetchAdminUserRisk(
  {
    request,
    userID,
  }: {
    request: RequestFn,
    userID: string,
  },
): Promise<AdminUserRiskProfile | null> {
  try {
    const response = await request<APIResponse<AdminUserRiskProfile>>({
      url: adminUsersUrl(`/${encodeURIComponent(userID)}/risk`),
      credentials: 'include',
    });

    if (!response.data?.success || !response.data.data) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

type AcceptWithdrawalsBody = {
  redemptionIDs: string[],
  attestation?: { reason: string },
};

type RejectWithdrawalsBody = {
  redemptionIDs: string[],
  reason?: string,
};

type WithdrawalsMutationBody = AcceptWithdrawalsBody | RejectWithdrawalsBody;

async function mutateAdminWithdrawals<T>(
  {
    path,
    data,
  }: {
    path: string,
    data: WithdrawalsMutationBody,
  },
): Promise<AdminMutationResult<T>> {
  try {
    const response = await clientRequest<APIResponse<T>>({
      url: adminWithdrawalsUrl(path),
      method: 'POST',
      credentials: 'include',
      data,
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

export async function acceptAdminWithdrawalsRequest(
  {
    redemptionIDs,
    reason,
  }: {
    redemptionIDs: string[],
    reason?: string,
  },
): Promise<AdminMutationResult<AdminWithdrawalBatchResult | AdminWithdrawalAttestationRequired>> {
  const body: AcceptWithdrawalsBody = { redemptionIDs };

  if (reason) body.attestation = { reason };

  return mutateAdminWithdrawals({
    path: '/accept',
    data: body,
  });
}

export async function rejectAdminWithdrawalsRequest(
  {
    redemptionIDs,
    reason,
  }: {
    redemptionIDs: string[],
    reason?: string,
  },
): Promise<AdminMutationResult<AdminWithdrawalBatchResult>> {
  const body: RejectWithdrawalsBody = { redemptionIDs };

  if (reason) body.reason = reason;

  return mutateAdminWithdrawals({
    path: '/reject',
    data: body,
  });
}

export async function clearAdminUserFlagRequest(
  {
    userID,
    flagID,
  }: {
    userID: string,
    flagID: string,
  },
): Promise<AdminMutationResult<UserFlag>> {
  try {
    const response = await clientRequest<APIResponse<UserFlag>>({
      url: adminUsersUrl(`/${encodeURIComponent(userID)}/flags/${encodeURIComponent(flagID)}/clear`),
      method: 'POST',
      credentials: 'include',
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
