'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSessions, revokeSession } from '@utils/profile';
import { clientRequest } from '@utils/clientRequest';
import type SanitizedUserSession from 'types/SanitizedUserSession';
import { queryKeys } from './queryKeys';

type UseSessionsQueryParams = {
  initialData?: SanitizedUserSession[] | null;
};

export function useSessionsQuery({
  initialData,
}: UseSessionsQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.profile.sessions(),
    queryFn: async () => {
      const sessions = await getSessions({ request: clientRequest });

      if (!sessions) {
        throw new Error('Failed to load sessions');
      }

      return sessions;
    },
    initialData: initialData ?? undefined,
  });
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionID: string) => {
      const success = await revokeSession({
        request: clientRequest,
        sessionID,
      });

      if (!success) {
        throw new Error('Failed to revoke session');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile.sessions() });
    },
  });
}
