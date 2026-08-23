import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type AdminDashboardStatistics from 'types/AdminDashboardStatistics';
import type { AdminDashboardPeriod } from 'types/AdminDashboardStatistics';

type RequestFn = typeof clientRequest | typeof serverRequest;

export { hasPermissions } from 'types/UserPermissions/StaffPermissions';

export type AdminDashboardQuery = {
  period?: AdminDashboardPeriod,
  start?: string,
  end?: string,
};

export async function fetchAdminDashboardStatistics(
  {
    request,
    period = 'week',
    start,
    end,
  }: {
    request: RequestFn,
  } & AdminDashboardQuery,
): Promise<AdminDashboardStatistics | null> {
  try {
    const params = new URLSearchParams({ period });

    if (period === 'custom' && start && end) {
      params.set('start', start);
      params.set('end', end);
    }

    const response = await request<APIResponse<AdminDashboardStatistics>>({
      url: `${getScope()}/admin/dashboard?${params.toString()}`,
      credentials: 'include',
    });

    if (!response.data?.success || !response.data.data) return null;

    return response.data.data;
  } catch {
    return null;
  }
}
