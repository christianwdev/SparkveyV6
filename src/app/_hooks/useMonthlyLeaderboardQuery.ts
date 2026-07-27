'use client';

import { useQuery } from '@tanstack/react-query';
import { clientRequest } from '@utils/clientRequest';
import { getMonthlyLeaderboard } from '@utils/leaderboard';
import type SanitizedLeaderboard from 'types/SanitizedLeaderboard';
import { queryKeys } from './queryKeys';

export function useMonthlyLeaderboardQuery(
  {
    initialData,
  }: {
    initialData?: SanitizedLeaderboard | null,
  } = {},
) {
  return useQuery({
    queryKey: queryKeys.leaderboard.monthly(),
    queryFn: async () => {
      const leaderboard = await getMonthlyLeaderboard({ request: clientRequest });
      if (!leaderboard) throw new Error('Failed to load leaderboard');

      return leaderboard;
    },
    initialData: initialData ?? undefined,
    throwOnError: false,
  });
}
