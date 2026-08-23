'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientRequest } from '@utils/clientRequest';
import {
  adminUserAffiliatesQueryOptions,
  adminUserEmailsQueryOptions,
  adminUserEarningsQueryOptions,
  adminUserQueryOptions,
  adminUserRedemptionsQueryOptions,
  adminUserSessionsQueryOptions,
  adminUserTransactionsQueryOptions,
  adminUserRiskQueryOptions,
  adminUsersListQueryOptions,
  adminWithdrawalsListQueryOptions,
  adminEarningsListQueryOptions,
  adminPostbacksListQueryOptions,
  adminOfferQueryOptions,
  adminOffersListQueryOptions,
  adminRedemptionMethodQueryOptions,
  adminRedemptionMethodsListQueryOptions,
  adminAnnouncementsListQueryOptions,
} from './adminUserQueries';
import { queryKeys } from './queryKeys';

// Types
import type { AdminUserFilterBy, AdminUserOrder, AdminUserSort } from 'types/AdminUser';
import type InternalEarning from 'types/Earnings/InternalEarning';
import type { InternalEarningStatus } from 'types/Earnings/InternalEarning';
import type {
  InternalRedemptionProvider,
  InternalRedemptionStatus,
} from 'types/Redemption/BaseInternalRedemption';
import type { AdminEarningSearchBy } from 'types/AdminEarning';
import type { AdminPostbackSearchBy, AdminPostbackStatus } from 'types/AdminPostback';
import type {
  AdminOfferSearchBy,
  AdminOfferSortBy,
  AdminOfferStatus,
} from 'types/AdminOffer';
import type {
  AdminRedemptionMethodSearchBy,
  AdminRedemptionMethodStatus,
} from 'types/AdminRedemptionMethod';
import type EmailActionable from 'types/EmailActionable';

export function useAdminUsersQuery(
  {
    search,
    filterBy,
    sort,
    order,
    page,
  }: {
    search: string,
    filterBy: AdminUserFilterBy,
    sort: AdminUserSort,
    order: AdminUserOrder,
    page: number,
  },
) {
  return useQuery(adminUsersListQueryOptions({
    request: clientRequest,
    search,
    filterBy,
    sort,
    order,
    page,
  }));
}

export function useAdminUserQuery(
  {
    userID,
  }: {
    userID: string,
  },
) {
  return useQuery(adminUserQueryOptions({
    request: clientRequest,
    userID,
  }));
}

export function useInvalidateAdminUser(userID: string) {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({
    queryKey: queryKeys.admin.users.detail(userID),
  });
}

export function useAdminUserSessionsQuery(
  {
    userID,
    page,
    activeOnly,
  }: {
    userID: string,
    page: number,
    activeOnly: boolean,
  },
) {
  return useQuery(adminUserSessionsQueryOptions({
    request: clientRequest,
    userID,
    page,
    activeOnly,
  }));
}

export function useAdminUserTransactionsQuery(
  {
    userID,
    page,
  }: {
    userID: string,
    page: number,
  },
) {
  return useQuery(adminUserTransactionsQueryOptions({
    request: clientRequest,
    userID,
    page,
  }));
}

export function useAdminUserEarningsQuery(
  {
    userID,
    page,
    status,
    type,
  }: {
    userID: string,
    page: number,
    status?: InternalEarningStatus,
    type?: InternalEarning['type'],
  },
) {
  return useQuery(adminUserEarningsQueryOptions({
    request: clientRequest,
    userID,
    page,
    status,
    type,
  }));
}

export function useAdminUserRedemptionsQuery(
  {
    userID,
    page,
    status,
    type,
  }: {
    userID: string,
    page: number,
    status?: InternalRedemptionStatus,
    type?: InternalRedemptionProvider,
  },
) {
  return useQuery(adminUserRedemptionsQueryOptions({
    request: clientRequest,
    userID,
    page,
    status,
    type,
  }));
}

export function useAdminUserAffiliatesQuery(
  {
    userID,
    page,
  }: {
    userID: string,
    page: number,
  },
) {
  return useQuery(adminUserAffiliatesQueryOptions({
    request: clientRequest,
    userID,
    page,
  }));
}

export function useAdminUserEmailsQuery(
  {
    userID,
    page,
    type,
  }: {
    userID: string,
    page: number,
    type?: EmailActionable['type'],
  },
) {
  return useQuery(adminUserEmailsQueryOptions({
    request: clientRequest,
    userID,
    page,
    type,
  }));
}

export function useAdminUserRiskQuery(
  {
    userID,
    enabled = true,
  }: {
    userID: string,
    enabled?: boolean,
  },
) {
  return useQuery({
    ...adminUserRiskQueryOptions({
      request: clientRequest,
      userID,
    }),
    enabled: enabled && !!userID,
  });
}

export function useAdminWithdrawalsQuery(
  {
    statuses,
    providers,
    page,
  }: {
    statuses: InternalRedemptionStatus[],
    providers: InternalRedemptionProvider[],
    page: number,
  },
) {
  return useQuery(adminWithdrawalsListQueryOptions({
    request: clientRequest,
    statuses,
    providers,
    page,
  }));
}

export function useAdminEarningsQuery(
  {
    statuses,
    searchBy,
    search,
    page,
  }: {
    statuses: InternalEarningStatus[],
    searchBy: AdminEarningSearchBy,
    search: string,
    page: number,
  },
) {
  return useQuery(adminEarningsListQueryOptions({
    request: clientRequest,
    statuses,
    searchBy,
    search,
    page,
  }));
}

export function useAdminPostbacksQuery(
  {
    statuses,
    searchBy,
    search,
    page,
  }: {
    statuses: AdminPostbackStatus[],
    searchBy: AdminPostbackSearchBy,
    search: string,
    page: number,
  },
) {
  return useQuery(adminPostbacksListQueryOptions({
    request: clientRequest,
    statuses,
    searchBy,
    search,
    page,
  }));
}

export function useAdminOffersQuery(
  {
    status,
    searchBy,
    search,
    sortBy,
    sortDirection,
    page,
  }: {
    status?: AdminOfferStatus,
    searchBy: AdminOfferSearchBy,
    search: string,
    sortBy: AdminOfferSortBy,
    sortDirection: 'asc' | 'desc',
    page: number,
  },
) {
  return useQuery(adminOffersListQueryOptions({
    request: clientRequest,
    status,
    searchBy,
    search,
    sortBy,
    sortDirection,
    page,
  }));
}

export function useAdminOfferQuery(
  {
    offerID,
  }: {
    offerID: string,
  },
) {
  return useQuery(adminOfferQueryOptions({
    request: clientRequest,
    offerID,
  }));
}

export function useAdminRedemptionMethodsQuery(
  {
    status,
    searchBy,
    search,
    sortDirection,
    page,
  }: {
    status?: AdminRedemptionMethodStatus,
    searchBy: AdminRedemptionMethodSearchBy,
    search: string,
    sortDirection: 'asc' | 'desc',
    page: number,
  },
) {
  return useQuery(adminRedemptionMethodsListQueryOptions({
    request: clientRequest,
    status,
    searchBy,
    search,
    sortDirection,
    page,
  }));
}

export function useAdminRedemptionMethodQuery(
  {
    rewardID,
  }: {
    rewardID: string,
  },
) {
  return useQuery(adminRedemptionMethodQueryOptions({
    request: clientRequest,
    rewardID,
  }));
}

export function useAdminAnnouncementsQuery() {
  return useQuery(adminAnnouncementsListQueryOptions({
    request: clientRequest,
  }));
}
