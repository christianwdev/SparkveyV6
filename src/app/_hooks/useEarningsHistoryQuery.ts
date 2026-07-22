'use client';

import { useQuery } from '@tanstack/react-query';
import { getEarningsHistory } from '@utils/profile';
import { clientRequest } from '@utils/clientRequest';
import type InternalEarning from 'types/Earnings/InternalEarning';
import type { InternalEarningStatus } from 'types/Earnings/InternalEarning';
import { queryKeys } from './queryKeys';

type UseEarningsHistoryQueryParams = {
  page?: number;
  status?: InternalEarningStatus;
  type?: InternalEarning['type'];
  initialData?: InternalEarning[] | null;
};

export function useEarningsHistoryQuery({
  page = 1,
  status,
  type,
  initialData,
}: UseEarningsHistoryQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.profile.earningsHistory({ page, status, type }),
    queryFn: async () => {
      const earnings = await getEarningsHistory({
        request: clientRequest,
        page,
        status,
        type,
      });

      if (!earnings) {
        throw new Error('Failed to load earnings history');
      }

      return earnings;
    },
    initialData: initialData ?? undefined,
  });
}
