import { queryOptions } from '@tanstack/react-query';
import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import {
  fetchAdminUser,
  fetchAdminUserAffiliates,
  fetchAdminUserEarnings,
  fetchAdminUserEmails,
  fetchAdminUserRedemptions,
  fetchAdminUserSessions,
  fetchAdminUserTransactions,
  fetchAdminUsers,
} from '@utils/adminUsers';
import { fetchAdminUserRisk, fetchAdminWithdrawals } from '@utils/adminWithdrawals';
import { fetchAdminEarnings } from '@utils/adminEarnings';
import { fetchAdminPostbacks } from '@utils/adminPostbacks';
import { queryKeys } from './queryKeys';

// Types
import type { AdminUserFilterBy, AdminUserOrder, AdminUserSort } from 'types/AdminUser';
import type InternalEarning from 'types/Earnings/InternalEarning';
import type { InternalEarningStatus } from 'types/Earnings/InternalEarning';
import type { InternalRedemptionProvider, InternalRedemptionStatus } from 'types/Redemption/BaseInternalRedemption';
import type { AdminEarningSearchBy } from 'types/AdminEarning';
import type { AdminPostbackSearchBy, AdminPostbackStatus } from 'types/AdminPostback';
import type EmailActionable from 'types/EmailActionable';

type RequestFn = typeof clientRequest | typeof serverRequest;

export function adminUsersListQueryOptions(
  {
    request,
    search,
    filterBy,
    sort,
    order,
    page,
  }: {
    request: RequestFn,
    search: string,
    filterBy: AdminUserFilterBy,
    sort: AdminUserSort,
    order: AdminUserOrder,
    page: number,
  },
) {
  return queryOptions({
    queryKey: queryKeys.admin.users.list({ search, filterBy, sort, order, page }),
    queryFn: async () => {
      const users = await fetchAdminUsers({
        request,
        search,
        filterBy,
        sort,
        order,
        page,
      });

      if (!users) throw new Error('Failed to load users');

      return users;
    },
  });
}

export function adminUserQueryOptions(
  {
    request,
    userID,
  }: {
    request: RequestFn,
    userID: string,
  },
) {
  return queryOptions({
    queryKey: queryKeys.admin.users.detail(userID),
    queryFn: async () => {
      const user = await fetchAdminUser({ request, userID });
      if (!user) throw new Error('Failed to load user');

      return user;
    },
    enabled: !!userID,
  });
}

export function adminUserSessionsQueryOptions(
  {
    request,
    userID,
    page,
    activeOnly,
  }: {
    request: RequestFn,
    userID: string,
    page: number,
    activeOnly: boolean,
  },
) {
  return queryOptions({
    queryKey: queryKeys.admin.users.sessions(userID, { page, activeOnly }),
    queryFn: async () => {
      const sessions = await fetchAdminUserSessions({
        request,
        userID,
        page,
        activeOnly,
      });

      if (!sessions) throw new Error('Failed to load sessions');

      return sessions;
    },
    enabled: !!userID,
  });
}

export function adminUserTransactionsQueryOptions(
  {
    request,
    userID,
    page,
  }: {
    request: RequestFn,
    userID: string,
    page: number,
  },
) {
  return queryOptions({
    queryKey: queryKeys.admin.users.transactions(userID, page),
    queryFn: async () => {
      const transactions = await fetchAdminUserTransactions({
        request,
        userID,
        page,
      });

      if (!transactions) throw new Error('Failed to load transactions');

      return transactions;
    },
    enabled: !!userID,
  });
}

export function adminUserEarningsQueryOptions(
  {
    request,
    userID,
    page,
    status,
    type,
  }: {
    request: RequestFn,
    userID: string,
    page: number,
    status?: InternalEarningStatus,
    type?: InternalEarning['type'],
  },
) {
  return queryOptions({
    queryKey: queryKeys.admin.users.earnings(userID, { page, status, type }),
    queryFn: async () => {
      const earnings = await fetchAdminUserEarnings({
        request,
        userID,
        page,
        status,
        type,
      });

      if (!earnings) throw new Error('Failed to load earnings');

      return earnings;
    },
    enabled: !!userID,
  });
}

export function adminUserRedemptionsQueryOptions(
  {
    request,
    userID,
    page,
    status,
    type,
  }: {
    request: RequestFn,
    userID: string,
    page: number,
    status?: InternalRedemptionStatus,
    type?: InternalRedemptionProvider,
  },
) {
  return queryOptions({
    queryKey: queryKeys.admin.users.redemptions(userID, { page, status, type }),
    queryFn: async () => {
      const redemptions = await fetchAdminUserRedemptions({
        request,
        userID,
        page,
        status,
        type,
      });

      if (!redemptions) throw new Error('Failed to load redemptions');

      return redemptions;
    },
    enabled: !!userID,
  });
}

export function adminUserAffiliatesQueryOptions(
  {
    request,
    userID,
    page,
  }: {
    request: RequestFn,
    userID: string,
    page: number,
  },
) {
  return queryOptions({
    queryKey: queryKeys.admin.users.affiliates(userID, page),
    queryFn: async () => {
      const affiliates = await fetchAdminUserAffiliates({
        request,
        userID,
        page,
      });

      if (!affiliates) throw new Error('Failed to load affiliates');

      return affiliates;
    },
    enabled: !!userID,
  });
}

export function adminUserEmailsQueryOptions(
  {
    request,
    userID,
    page,
    type,
  }: {
    request: RequestFn,
    userID: string,
    page: number,
    type?: EmailActionable['type'],
  },
) {
  return queryOptions({
    queryKey: queryKeys.admin.users.emails(userID, { page, type }),
    queryFn: async () => {
      const emails = await fetchAdminUserEmails({
        request,
        userID,
        page,
        type,
      });

      if (!emails) throw new Error('Failed to load emails');

      return emails;
    },
    enabled: !!userID,
  });
}

export function adminUserRiskQueryOptions(
  {
    request,
    userID,
  }: {
    request: RequestFn,
    userID: string,
  },
) {
  return queryOptions({
    queryKey: queryKeys.admin.users.risk(userID),
    queryFn: async () => {
      const risk = await fetchAdminUserRisk({ request, userID });
      if (!risk) throw new Error('Failed to load user risk');

      return risk;
    },
    enabled: !!userID,
  });
}

export function adminWithdrawalsListQueryOptions(
  {
    request,
    statuses,
    providers,
    page,
  }: {
    request: RequestFn,
    statuses: InternalRedemptionStatus[],
    providers: InternalRedemptionProvider[],
    page: number,
  },
) {
  return queryOptions({
    queryKey: queryKeys.admin.withdrawals.list({
      status: [ ...statuses ].sort(),
      provider: [ ...providers ].sort(),
      page,
    }),
    queryFn: async () => {
      const rows = await fetchAdminWithdrawals({
        request,
        statuses,
        providers,
        page,
      });

      if (!rows) throw new Error('Failed to load withdrawals');

      return rows;
    },
  });
}

export function adminEarningsListQueryOptions(
  {
    request,
    statuses,
    searchBy,
    search,
    page,
  }: {
    request: RequestFn,
    statuses: InternalEarningStatus[],
    searchBy: AdminEarningSearchBy,
    search: string,
    page: number,
  },
) {
  return queryOptions({
    queryKey: queryKeys.admin.earnings.list({
      status: [ ...statuses ].sort(),
      searchBy,
      search,
      page,
    }),
    queryFn: async () => {
      const rows = await fetchAdminEarnings({
        request,
        statuses,
        searchBy,
        search,
        page,
      });

      if (!rows) throw new Error('Failed to load earnings');

      return rows;
    },
  });
}

export function adminPostbacksListQueryOptions(
  {
    request,
    statuses,
    searchBy,
    search,
    page,
  }: {
    request: RequestFn,
    statuses: AdminPostbackStatus[],
    searchBy: AdminPostbackSearchBy,
    search: string,
    page: number,
  },
) {
  return queryOptions({
    queryKey: queryKeys.admin.postbacks.list({
      status: [ ...statuses ].sort(),
      searchBy,
      search,
      page,
    }),
    queryFn: async () => {
      const rows = await fetchAdminPostbacks({
        request,
        statuses,
        searchBy,
        search,
        page,
      });

      if (!rows) throw new Error('Failed to load postbacks');

      return rows;
    },
  });
}
