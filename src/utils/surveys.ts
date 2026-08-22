import type { clientRequest } from '@utils/clientRequest';
import type { serverRequest } from '@utils/serverRequest';
import { getScope } from '@utils/scope';
import type APIResponse from 'types/APIResponse';
import type SanitizedCPXSurvey from 'types/CPX/SanitizedCPXSurvey';

type RequestFn = typeof clientRequest | typeof serverRequest;

export const SURVEYS_LIST_LIMIT = 50;

export async function getSurveys(
  {
    request,
    limit = SURVEYS_LIST_LIMIT,
  }: {
    request: RequestFn,
    limit?: number,
  },
): Promise<SanitizedCPXSurvey[] | null> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await request<APIResponse<SanitizedCPXSurvey[]>>({
      url: `${getScope()}/surveys?${params.toString()}`,
      credentials: 'include',
    });

    if (!response.data?.success) return null;

    return response.data.data ?? [];
  } catch {
    return null;
  }
}
