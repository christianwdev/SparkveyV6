import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type SanitizedChatConversation from 'types/SanitizedChatConversation';
import type { AdminMutationResult } from '@utils/adminUsers';

type RequestFn = typeof clientRequest | typeof serverRequest;

export async function getAdminSupportConversations(
  {
    request,
  }: {
    request: RequestFn;
  },
): Promise<SanitizedChatConversation[] | null> {
  try {
    const response = await request<APIResponse<SanitizedChatConversation[]>>({
      url: `${getScope()}/admin/chat/conversations`,
      credentials: 'include',
    });

    if (!response.data?.success || response.data.data === undefined) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function createAdminSupportConversation(
  {
    request,
    userID,
  }: {
    request: RequestFn;
    userID: string;
  },
): Promise<AdminMutationResult<SanitizedChatConversation>> {
  try {
    const response = await request<APIResponse<SanitizedChatConversation>>({
      url: `${getScope()}/admin/chat/create`,
      method: 'POST',
      credentials: 'include',
      data: { userID },
    });

    return {
      success: response.data.success,
      data: response.data.data,
      code: response.data.code,
      message: response.data.message,
    };
  } catch {
    return {
      success: false,
      message: 'Failed to create conversation',
    };
  }
}
