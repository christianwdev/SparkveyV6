import { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type { UserNotification } from 'types/UserNotification/UserNotifications';

type RequestFn = typeof clientRequest | typeof serverRequest;

export async function getRecentNotifications(
  {
    request,
  }: {
    request: RequestFn,
  },
): Promise<UserNotification[] | null> {
  try {
    const response = await request<APIResponse<UserNotification[]>>({
      url: `${getScope()}/user/notifications/recent`,
      credentials: 'include',
    });

    if (!response.data?.success || !response.data.data) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function markNotificationsRead(
  {
    notificationIDs,
  }: {
    notificationIDs?: string[],
  } = {},
): Promise<boolean> {
  try {
    const response = await clientRequest<APIResponse<null>>({
      url: `${getScope()}/user/notifications/read`,
      method: 'POST',
      credentials: 'include',
      data: notificationIDs ? { notificationIDs } : {},
    });

    return !!response.data?.success;
  } catch {
    return false;
  }
}
