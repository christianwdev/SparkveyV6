import { getGlobalObject } from 'backend/utils/globalObject';
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import { hashEmail, normalizeEmailForHash } from 'backend/utils/emailHash';

// Types
import type DeletedAccountFingerprint from 'types/DeletedAccountFingerprint';
import type FunctionResponse from 'types/FunctionResponse';

export async function recordDeletedAccountFingerprint(
  {
    email,
    userID,
  }: {
    email: string,
    userID: string,
  },
): Promise<FunctionResponse<DeletedAccountFingerprint>> {
  try {
    const { db } = getGlobalObject();
    const normalized = normalizeEmailForHash(email);
    const fingerprint: DeletedAccountFingerprint = {
      emailHash: hashEmail(normalized),
      userID,
      deletedAt: new Date(),
    };

    const result = await db.collection<DeletedAccountFingerprint>(
      DatabaseCollections.deletedAccountFingerprints,
    ).updateOne(
      { emailHash: fingerprint.emailHash },
      { $set: fingerprint },
      { upsert: true },
    );

    if (!result.acknowledged) return { ok: false, error: 'internalServerError' };

    return { ok: true, data: fingerprint };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function recordDeletedAccountFingerprints(
  {
    emails,
    userID,
  }: {
    emails: Array<string | undefined | null>,
    userID: string,
  },
): Promise<FunctionResponse<void>> {
  const uniqueEmails = [ ...new Set(
    emails
      .map((email) => {
        if (!email || typeof email !== 'string' || email.trim().length === 0) return undefined;

        return normalizeEmailForHash(email);
      })
      .filter((email): email is string => !!email),
  ) ];

  if (uniqueEmails.length === 0) {
    return { ok: false, error: 'internalServerError' };
  }

  for (const email of uniqueEmails) {
    const result = await recordDeletedAccountFingerprint({ email, userID });
    if (!result.ok) return { ok: false, error: result.error };
  }

  return { ok: true, data: undefined };
}

export async function isDeletedEmail(
  email: string,
): Promise<FunctionResponse<boolean>> {
  try {
    const { db } = getGlobalObject();
    const normalized = normalizeEmailForHash(email);
    const existing = await db.collection<DeletedAccountFingerprint>(
      DatabaseCollections.deletedAccountFingerprints,
    ).findOne({
      emailHash: hashEmail(normalized),
    });

    return { ok: true, data: !!existing };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}
