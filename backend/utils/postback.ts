import type { Context } from 'hono';

import DatabaseCollections from 'backend/constants/DatabaseCollections';
import type InternalPostbackRequest from 'types/InternalPostbackRequest';

import { getIPFromRequest, normalizeQuery } from './request';

export type UpdatePostbackLogFields = Partial<
  Pick<
    InternalPostbackRequest,
    | 'status'
    | 'resolvedProviderId'
    | 'failureReason'
    | 'failureDetail'
    | 'validationIssues'
    | 'normalized'
    | 'securityChecksSkipped'
  >
>;

function postbackLogs() {
  return global.globalObject.db.collection<InternalPostbackRequest>(
    DatabaseCollections.postbackLogs,
  );
}

export async function logPendingPostback(c: Context) {
  const logObject: InternalPostbackRequest = {
    date: new Date(),
    originalURL: c.req.url,
    provider: c.req.param('provider'),
    query: normalizeQuery(c.req.query()),
    remoteIP: getIPFromRequest(c) ?? null,
    status: 'pending',
    requestID: c.get('requestID'),
  };

  await postbackLogs().insertOne(logObject);
}

export async function updatePostbackLog(
  requestID: string | undefined,
  fields: UpdatePostbackLogFields,
) {
  if (!requestID) return;

  await postbackLogs().updateOne(
    { requestID },
    { $set: { ...fields, completedAt: new Date() } },
  );
}
