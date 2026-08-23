// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';

// Types
import type { Filter } from 'mongodb';
import type FunctionResponse from 'types/FunctionResponse';
import type InternalPostbackRequest from 'types/InternalPostbackRequest';
import type {
  AdminPostbackListFilters,
  AdminPostbackRow,
} from 'types/AdminPostback';

export const ADMIN_POSTBACKS_PAGE_SIZE = 10;

export type ListAdminPostbacksError = 'internalServerError';

export async function listAdminPostbacks(
  {
    statuses,
    searchBy,
    search,
    limit,
    offset,
  }: AdminPostbackListFilters,
): Promise<FunctionResponse<AdminPostbackRow[], ListAdminPostbacksError>> {
  try {
    const { db } = getGlobalObject();
    const query: Filter<InternalPostbackRequest> = {};

    if (statuses && statuses.length > 0) {
      query.status = { $in: statuses };
    }

    const trimmedSearch = search?.trim() ?? '';
    if (trimmedSearch && searchBy) {
      query[searchBy] = trimmedSearch;
    }

    const logs = await db.collection<InternalPostbackRequest>(DatabaseCollections.postbackLogs)
      .find(query)
      .project<AdminPostbackRow>({
        requestID: 1,
        date: 1,
        provider: 1,
        status: 1,
        remoteIP: 1,
        failureReason: 1,
        failureDetail: 1,
        _id: 0,
      })
      .sort({ date: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return { ok: true, data: logs };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}
