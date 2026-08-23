import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type ActiveAnnouncement from 'types/Announcement/ActiveAnnouncement';

type RequestFn = typeof clientRequest | typeof serverRequest;

export async function getActiveAnnouncement(
  {
    request,
  }: {
    request: RequestFn,
  },
): Promise<ActiveAnnouncement | null> {
  try {
    const response = await request<APIResponse<ActiveAnnouncement>>({
      url: `${getScope()}/announcements/active`,
    });

    if (!response.data?.success) return null;

    return response.data.data ?? null;
  } catch {
    return null;
  }
}
