import type { Context } from 'hono';

import DatabaseCollections from 'backend/constants/DatabaseCollections';
import SiteConfig from 'backend/config/config';
import { getGlobalObject } from 'backend/utils/globalObject';
import { getPostbackProvider, validationFailureToLogFields } from 'backend/schemas/postback';
import type { PostbackQuery } from 'types/Postback/PostbackValidation';
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
    | 'retryCount'
    | 'lastRetriedAt'
  >
>;

export type ProcessPostbackResult = {
  provider: ReturnType<typeof getPostbackProvider>;
  ok: boolean;
  logUpdate: UpdatePostbackLogFields;
};

export type RetryPostbackResult = {
  success: boolean;
  message: string;
  data?: {
    ok: boolean;
    retryCount: number;
    normalized?: InternalPostbackRequest['normalized'];
    failureReason?: InternalPostbackRequest['failureReason'];
    failureDetail?: InternalPostbackRequest['failureDetail'];
  };
};

const FAILURE_FIELDS_TO_CLEAR = [
  'failureReason',
  'failureDetail',
  'validationIssues',
] as const;

function postbackLogs() {
  const { db } = getGlobalObject();

  return db.collection<InternalPostbackRequest>(
    DatabaseCollections.postbackLogs,
  );
}

/** Minimal context for replay; providers that need request headers may require a live retry via GET. */
function createReplayContext(): Context {
  return {
    req: {
      header: () => undefined,
    },
  } as unknown as Context;
}

export function processPostback({
  routeProvider,
  query,
  remoteIP,
  context,
}: {
  routeProvider: string;
  query: PostbackQuery;
  remoteIP?: string;
  context: Context;
}): ProcessPostbackResult {
  const provider = getPostbackProvider(routeProvider);

  if (!provider) {
    return {
      provider: undefined,
      ok: false,
      logUpdate: {
        status: 'failed',
        failureReason: 'unknown_provider',
        failureDetail: `No provider registered for "${routeProvider}".`,
      },
    };
  }

  const result = provider.validate({ query, remoteIP }, context);

  if (result.ok) {
    return {
      provider,
      ok: true,
      logUpdate: {
        status: 'completed',
        resolvedProviderId: provider.id,
        normalized: result.normalized,
        ...(SiteConfig.postback.disableSecurityChecks && { securityChecksSkipped: true }),
      },
    };
  }

  return {
    provider,
    ok: false,
    logUpdate: {
      status: 'failed',
      resolvedProviderId: provider.id,
      ...validationFailureToLogFields(result),
    },
  };
}

export async function getPostbackLog(requestID: string) {
  return postbackLogs().findOne({ requestID });
}

export async function logPendingPostback(c: Context) {
  const logObject: InternalPostbackRequest = {
    date: new Date(),
    originalURL: c.req.url,
    provider: c.req.param('provider') ?? '',
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
  options?: { unsetFailureFields?: boolean },
) {
  if (!requestID) return;

  const update: {
    $set: UpdatePostbackLogFields & { completedAt: Date };
    $unset?: Record<string, ''>;
  } = {
    $set: { ...fields, completedAt: new Date() },
  };

  if (options?.unsetFailureFields) {
    update.$unset = Object.fromEntries(
      FAILURE_FIELDS_TO_CLEAR.map(key => [ key, '' ]),
    ) as Record<string, ''>;
  }

  await postbackLogs().updateOne({ requestID }, update);
}

export async function retryPostbackLog(requestID: string): Promise<RetryPostbackResult> {
  const log = await getPostbackLog(requestID);

  if (!log) {
    return { success: false, message: 'Postback log not found' };
  }

  if (log.status !== 'failed') {
    return {
      success: false,
      message: `Only failed postbacks can be retried (current status: ${log.status})`,
    };
  }

  const retryCount = (log.retryCount ?? 0) + 1;
  const { ok, logUpdate } = processPostback({
    routeProvider: log.resolvedProviderId ?? log.provider,
    query: log.query,
    remoteIP: log.remoteIP ?? undefined,
    context: createReplayContext(),
  });

  if (ok) {
    await updatePostbackLog(
      requestID,
      { ...logUpdate, retryCount, lastRetriedAt: new Date() },
      { unsetFailureFields: true },
    );

    return {
      success: true,
      message: 'Postback replay succeeded',
      data: { ok: true, retryCount, normalized: logUpdate.normalized },
    };
  }

  await updatePostbackLog(requestID, {
    ...logUpdate,
    retryCount,
    lastRetriedAt: new Date(),
  });

  return {
    success: false,
    message: 'Postback replay failed validation',
    data: {
      ok: false,
      retryCount,
      failureReason: logUpdate.failureReason,
      failureDetail: logUpdate.failureDetail,
    },
  };
}
