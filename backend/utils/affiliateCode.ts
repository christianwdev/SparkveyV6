import { MongoServerError } from 'mongodb';
import { getGlobalObject } from 'backend/utils/globalObject';
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Types
import type { Filter } from 'mongodb';
import type AffiliateCode from 'types/AffiliateCode';
import type FunctionResponse from 'types/FunctionResponse';

export type CreateAffiliateCodeError = 'alreadyExists' | 'internalServerError';

export async function createAffiliateCode(
  {
    userID,
    code,
  }: {
    userID: string;
    code: string;
  },
): Promise<FunctionResponse<AffiliateCode, CreateAffiliateCodeError>> {
  try {
    const { db } = getGlobalObject();

    const affiliateCode: AffiliateCode = {
      userID,
      code: sanitizeCode(code),
      totalEarnings: 0,
      tasksCompleted: 0,
      createdAt: new Date(),
    };

    const result = await db.collection<AffiliateCode>(DatabaseCollections.affiliateCodes).insertOne(affiliateCode);

    if (!result.acknowledged) return { ok: false, error: 'internalServerError' };

    return { ok: true, data: affiliateCode };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return { ok: false, error: 'alreadyExists' };
    }

    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getAffiliateCode(
  partialAffiliateCode: Filter<AffiliateCode>,
): Promise<FunctionResponse<AffiliateCode>> {
  try {
    const { db } = getGlobalObject();

    const affiliateCode = await db.collection<AffiliateCode>(DatabaseCollections.affiliateCodes).findOne(partialAffiliateCode);

    if (!affiliateCode) return { ok: false, error: 'notFound' };

    return { ok: true, data: affiliateCode };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getAffiliateCodesByUserID(
  userID: string,
): Promise<FunctionResponse<AffiliateCode[]>> {
  try {
    const { db } = getGlobalObject();

    const affiliateCodes = await db.collection<AffiliateCode>(DatabaseCollections.affiliateCodes).find({ userID })
      .sort({ createdAt: -1 })
      .toArray();

    return { ok: true, data: affiliateCodes };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function disableAffiliateCode(
  {
    userID,
    code,
  }: {
    userID: string;
    code: string;
  },
): Promise<FunctionResponse<AffiliateCode>> {
  try {
    const { db } = getGlobalObject();

    const affiliateCode = await db.collection<AffiliateCode>(DatabaseCollections.affiliateCodes).findOneAndUpdate(
      {
        userID,
        code: sanitizeCode(code),
        disabledAt: { $exists: false },
      },
      {
        $set: {
          disabledAt: new Date(),
        },
      },
      { returnDocument: 'after' },
    );

    if (!affiliateCode) return { ok: false, error: 'notFound' };

    return { ok: true, data: affiliateCode };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

function sanitizeCode(code: string): string {
  return code.trim().toLowerCase();
}
