'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@i18n/navigation';
import { useUser } from '@contexts/UserProvider';
import { clientRequest } from '@utils/clientRequest';
import { getScope } from '@utils/scope';
import type APIResponse from 'types/APIResponse';

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setUser } = useUser();

  return useMutation({
    mutationFn: async () => {
      await clientRequest<APIResponse<null>>({
        url: `${getScope()}/auth/logout`,
        method: 'POST',
        credentials: 'include',
      });
    },
    onSettled: () => {
      setUser(null);
      queryClient.clear();
      router.push('/');
    },
  });
}
