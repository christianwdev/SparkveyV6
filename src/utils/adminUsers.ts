import { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type AdminUser from 'types/AdminUser';
import type {
  AdminUserAffiliateData,
  AdminUserFilterBy,
  AdminUserListItem,
  AdminUserOrder,
  AdminUserSession,
  AdminUserSort,
  AdminEmailActionable,
} from 'types/AdminUser';
import type InternalEarning from 'types/Earnings/InternalEarning';
import type { InternalEarningStatus } from 'types/Earnings/InternalEarning';
import type InternalTransaction from 'types/Transactions/InternalTransaction';
import type InternalRedemption from 'types/Redemption/InternalRedemption';
import type {
  InternalRedemptionProvider,
  InternalRedemptionStatus,
} from 'types/Redemption/BaseInternalRedemption';
import type EmailActionable from 'types/EmailActionable';
import type InternalUser from 'types/User/InternalUser';

type RequestFn = typeof clientRequest | typeof serverRequest;

export const ADMIN_USERS_PAGE_SIZE = 10;
export const ADMIN_USER_HISTORY_PAGE_SIZE = 10;

export type AdminMutationResult<T> = {
  success: boolean,
  data?: T,
  code?: string,
  message?: string,
};

type ListAdminUsersParams = {
  request: RequestFn,
  search?: string,
  filterBy?: AdminUserFilterBy,
  sort?: AdminUserSort,
  order?: AdminUserOrder,
  page?: number,
  limit?: number,
};

function adminUsersUrl(path: string, params?: URLSearchParams): string {
  const query = params?.toString();

  return query
    ? `${getScope()}/admin/users${path}?${query}`
    : `${getScope()}/admin/users${path}`;
}

export async function fetchAdminUsers(
  {
    request,
    search = '',
    filterBy = 'username',
    sort = 'createdAt',
    order = 'desc',
    page = 1,
    limit = ADMIN_USERS_PAGE_SIZE,
  }: ListAdminUsersParams,
): Promise<AdminUserListItem[] | null> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
      sort,
      order,
      filterBy,
    });

    if (search.trim()) params.set('search', search.trim());

    const response = await request<APIResponse<AdminUserListItem[]>>({
      url: adminUsersUrl('/list', params),
      credentials: 'include',
    });

    if (!response.data?.success || response.data.data === undefined) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function fetchAdminUser(
  {
    request,
    userID,
  }: {
    request: RequestFn,
    userID: string,
  },
): Promise<AdminUserListItem | null> {
  try {
    const response = await request<APIResponse<AdminUserListItem>>({
      url: adminUsersUrl(`/${encodeURIComponent(userID)}`),
      credentials: 'include',
    });

    if (!response.data?.success || response.data.data === undefined) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function fetchAdminUserSessions(
  {
    request,
    userID,
    page = 1,
    activeOnly = false,
    limit = ADMIN_USER_HISTORY_PAGE_SIZE,
  }: {
    request: RequestFn,
    userID: string,
    page?: number,
    activeOnly?: boolean,
    limit?: number,
  },
): Promise<AdminUserSession[] | null> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
    });

    if (activeOnly) params.set('activeOnly', 'true');

    const response = await request<APIResponse<AdminUserSession[]>>({
      url: adminUsersUrl(`/${encodeURIComponent(userID)}/sessions`, params),
      credentials: 'include',
    });

    if (!response.data?.success || response.data.data === undefined) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function fetchAdminUserTransactions(
  {
    request,
    userID,
    page = 1,
    limit = ADMIN_USER_HISTORY_PAGE_SIZE,
  }: {
    request: RequestFn,
    userID: string,
    page?: number,
    limit?: number,
  },
): Promise<InternalTransaction[] | null> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
    });

    const response = await request<APIResponse<InternalTransaction[]>>({
      url: adminUsersUrl(`/${encodeURIComponent(userID)}/transactions`, params),
      credentials: 'include',
    });

    if (!response.data?.success || response.data.data === undefined) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function fetchAdminUserEarnings(
  {
    request,
    userID,
    page = 1,
    status,
    type,
    limit = ADMIN_USER_HISTORY_PAGE_SIZE,
  }: {
    request: RequestFn,
    userID: string,
    page?: number,
    status?: InternalEarningStatus,
    type?: InternalEarning['type'],
    limit?: number,
  },
): Promise<InternalEarning[] | null> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
    });

    if (status) params.set('status', status);
    if (type) params.set('type', type);

    const response = await request<APIResponse<InternalEarning[]>>({
      url: adminUsersUrl(`/${encodeURIComponent(userID)}/earnings`, params),
      credentials: 'include',
    });

    if (!response.data?.success || response.data.data === undefined) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function fetchAdminUserRedemptions(
  {
    request,
    userID,
    page = 1,
    status,
    type,
    limit = ADMIN_USER_HISTORY_PAGE_SIZE,
  }: {
    request: RequestFn,
    userID: string,
    page?: number,
    status?: InternalRedemptionStatus,
    type?: InternalRedemptionProvider,
    limit?: number,
  },
): Promise<InternalRedemption[] | null> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
    });

    if (status) params.set('status', status);
    if (type) params.set('type', type);

    const response = await request<APIResponse<InternalRedemption[]>>({
      url: adminUsersUrl(`/${encodeURIComponent(userID)}/redemptions`, params),
      credentials: 'include',
    });

    if (!response.data?.success || response.data.data === undefined) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function fetchAdminUserAffiliates(
  {
    request,
    userID,
    page = 1,
    limit = ADMIN_USER_HISTORY_PAGE_SIZE,
  }: {
    request: RequestFn,
    userID: string,
    page?: number,
    limit?: number,
  },
): Promise<AdminUserAffiliateData | null> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
    });

    const response = await request<APIResponse<AdminUserAffiliateData>>({
      url: adminUsersUrl(`/${encodeURIComponent(userID)}/affiliates`, params),
      credentials: 'include',
    });

    if (!response.data?.success || response.data.data === undefined) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function fetchAdminUserEmails(
  {
    request,
    userID,
    page = 1,
    type,
    limit = ADMIN_USER_HISTORY_PAGE_SIZE,
  }: {
    request: RequestFn,
    userID: string,
    page?: number,
    type?: EmailActionable['type'],
    limit?: number,
  },
): Promise<AdminEmailActionable[] | null> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
    });

    if (type) params.set('type', type);

    const response = await request<APIResponse<AdminEmailActionable[]>>({
      url: adminUsersUrl(`/${encodeURIComponent(userID)}/emails`, params),
      credentials: 'include',
    });

    if (!response.data?.success || response.data.data === undefined) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

async function mutateAdminUser<T>(
  {
    method,
    path,
    data,
  }: {
    method: 'PATCH' | 'POST' | 'DELETE',
    path: string,
    data?: object,
  },
): Promise<AdminMutationResult<T>> {
  try {
    const response = await clientRequest<APIResponse<T>>({
      url: adminUsersUrl(path),
      method,
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

export async function updateAdminUserRequest(
  {
    userID,
    username,
    email,
    emailVerified,
    userConfiguration,
  }: {
    userID: string,
    username?: string,
    email?: string,
    emailVerified?: boolean,
    userConfiguration?: Partial<InternalUser['userConfiguration']>,
  },
): Promise<AdminMutationResult<AdminUser>> {
  const body: {
    username?: string,
    email?: string,
    emailVerified?: boolean,
    userConfiguration?: Partial<InternalUser['userConfiguration']>,
  } = {};

  if (username !== undefined) body.username = username;
  if (email !== undefined) body.email = email;
  if (emailVerified !== undefined) body.emailVerified = emailVerified;
  if (userConfiguration !== undefined) body.userConfiguration = userConfiguration;

  return mutateAdminUser<AdminUser>({
    method: 'PATCH',
    path: `/${encodeURIComponent(userID)}`,
    data: body,
  });
}

export async function adjustAdminUserBalanceRequest(
  {
    userID,
    amount,
  }: {
    userID: string,
    amount: number,
  },
): Promise<AdminMutationResult<{ user: AdminUser, transaction: InternalTransaction }>> {
  return mutateAdminUser({
    method: 'POST',
    path: `/${encodeURIComponent(userID)}/balance`,
    data: { amount },
  });
}

export async function banAdminUserRequest(
  {
    userID,
    until,
  }: {
    userID: string,
    until?: string,
  },
): Promise<AdminMutationResult<AdminUser>> {
  const data: { until?: string } = {};
  if (until) data.until = until;

  return mutateAdminUser<AdminUser>({
    method: 'POST',
    path: `/${encodeURIComponent(userID)}/ban`,
    data,
  });
}

export async function unbanAdminUserRequest(
  {
    userID,
  }: {
    userID: string,
  },
): Promise<AdminMutationResult<AdminUser>> {
  return mutateAdminUser<AdminUser>({
    method: 'DELETE',
    path: `/${encodeURIComponent(userID)}/ban`,
  });
}

export async function revokeAdminUserSessionRequest(
  {
    userID,
    sessionID,
  }: {
    userID: string,
    sessionID: string,
  },
): Promise<AdminMutationResult<void>> {
  return mutateAdminUser({
    method: 'DELETE',
    path: `/${encodeURIComponent(userID)}/sessions/${encodeURIComponent(sessionID)}`,
  });
}

export async function revokeAllAdminUserSessionsRequest(
  {
    userID,
  }: {
    userID: string,
  },
): Promise<AdminMutationResult<void>> {
  return mutateAdminUser({
    method: 'POST',
    path: `/${encodeURIComponent(userID)}/sessions/revoke-all`,
  });
}
