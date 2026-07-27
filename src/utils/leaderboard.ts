import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';

// Types
import type APIResponse from 'types/APIResponse';
import type SanitizedLeaderboard from 'types/SanitizedLeaderboard';

type RequestFn = typeof clientRequest | typeof serverRequest;

export async function getMonthlyLeaderboard(
  {
    request,
  }: {
    request: RequestFn,
  },
): Promise<SanitizedLeaderboard | null> {
  try {
    const response = await request<APIResponse<SanitizedLeaderboard>>({
      url: `${getScope()}/leaderboard/monthly`,
    });

    if (!response.data?.success || !response.data.data) return null;

    return response.data.data;
  } catch {
    return null;
  }
}
