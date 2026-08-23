import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type SanitizedUserSupportChat from 'types/SanitizedUserSupportChat';

type RequestFn = typeof clientRequest | typeof serverRequest;

export const SUPPORT_MESSAGE_MAX_LENGTH = 1000;

export async function getSupportConversation(
  {
    request,
  }: {
    request: RequestFn;
  },
): Promise<SanitizedUserSupportChat | null> {
  try {
    const response = await request<APIResponse<SanitizedUserSupportChat | null>>({
      url: `${getScope()}/support/conversation`,
      credentials: 'include',
    });

    if (!response.data?.success) return null;

    return response.data.data ?? null;
  } catch {
    return null;
  }
}
