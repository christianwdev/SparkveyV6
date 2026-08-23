import { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type AnnouncementSettings from 'types/Settings/AnnouncementSettings';
import type { AdminMutationResult } from '@utils/adminUsers';

type RequestFn = typeof clientRequest | typeof serverRequest;

function adminAnnouncementsUrl(path: string = ''): string {
  const suffix = path === '/' ? '' : path;

  return `${getScope()}/admin/announcements${suffix}`;
}

export async function fetchAdminAnnouncements(
  {
    request,
  }: {
    request: RequestFn,
  },
): Promise<AnnouncementSettings[] | null> {
  try {
    const response = await request<APIResponse<AnnouncementSettings[]>>({
      url: adminAnnouncementsUrl(),
      credentials: 'include',
    });

    if (!response.data?.success || response.data.data === undefined) return null;

    return response.data.data;
  } catch {
    return null;
  }
}

export async function createAdminAnnouncementRequest(
  {
    message,
  }: {
    message: string,
  },
): Promise<AdminMutationResult<AnnouncementSettings>> {
  try {
    const response = await clientRequest<APIResponse<AnnouncementSettings>>({
      url: adminAnnouncementsUrl(),
      method: 'POST',
      credentials: 'include',
      data: {
        message,
      },
    });

    return {
      success: !!response.data?.success,
      data: response.data?.data,
      code: response.data?.code,
      message: response.data?.message,
    };
  } catch {
    return { success: false };
  }
}

export async function disableAdminAnnouncementRequest(): Promise<AdminMutationResult<AnnouncementSettings>> {
  try {
    const response = await clientRequest<APIResponse<AnnouncementSettings>>({
      url: adminAnnouncementsUrl('/disable'),
      method: 'POST',
      credentials: 'include',
    });

    return {
      success: !!response.data?.success,
      data: response.data?.data,
      code: response.data?.code,
      message: response.data?.message,
    };
  } catch {
    return { success: false };
  }
}
