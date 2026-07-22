'use client';

import { useQuery } from '@tanstack/react-query';
import { getRedemptionsHistory } from '@utils/profile';
import { clientRequest } from '@utils/clientRequest';
import type InternalRedemption from 'types/Redemption/InternalRedemption';
import type {
  InternalRedemptionProvider,
  InternalRedemptionStatus,
} from 'types/Redemption/BaseInternalRedemption';
import { queryKeys } from './queryKeys';

type UseRedemptionsHistoryQueryParams = {
  page?: number;
  status?: InternalRedemptionStatus;
  type?: InternalRedemptionProvider;
  initialData?: InternalRedemption[] | null;
};

export function useRedemptionsHistoryQuery({
  page = 1,
  status,
  type,
  initialData,
}: UseRedemptionsHistoryQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.profile.redemptionsHistory({ page, status, type }),
    queryFn: async () => {
      const redemptions = await getRedemptionsHistory({
        request: clientRequest,
        page,
        status,
        type,
      });

      if (!redemptions) {
        throw new Error('Failed to load redemptions history');
      }

      return redemptions;
    },
    initialData: initialData ?? undefined,
  });
}
