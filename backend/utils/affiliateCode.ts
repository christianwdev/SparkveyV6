import { createId } from '@paralleldrive/cuid2';
import { MongoServerError } from 'mongodb';
import { getGlobalObject } from 'backend/utils/globalObject';
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import SocketEmits from 'backend/constants/SocketEmits';

// Utils
import { getRawUser } from 'backend/utils/user';

// Types
import type { Filter } from 'mongodb';
import type AffiliateCode from 'types/AffiliateCode';
import type FunctionResponse from 'types/FunctionResponse';
import type InternalUser from 'types/InternalUser';
import type InternalTransaction from 'types/Transactions/InternalTransaction';

export type CreateAffiliateCodeError = 'alreadyExists' | 'internalServerError';

export type UseAffiliateCodeError = 'notFound' | 'alreadyClaimed' | 'ownCode' | 'internalServerError';

export type ClaimReferralEarningsError = 'noPendingEarnings' | 'internalServerError';

export async function getNumberOfUsersAffiliateCodes(
  {
    userID,
  }: {
    userID: string;
  },
): Promise<FunctionResponse<number>> {
  try {
    const { db } = getGlobalObject();

    const numberOfUsersAffiliateCodes = await db.collection<AffiliateCode>(DatabaseCollections.affiliateCodes).countDocuments({
      userID,
      disabledAt: {
        $exists: false,
      },
    });

    return { ok: true, data: numberOfUsersAffiliateCodes };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

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
        disabledAt: {
          $exists: false,
        },
      },
      {
        $set: {
          disabledAt: new Date(),
        },
      },
      {
        returnDocument: 'after',
      },
    );

    if (!affiliateCode) return { ok: false, error: 'notFound' };

    return { ok: true, data: affiliateCode };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function useAffiliateCode(
  {
    userID,
    code,
  }: {
    userID: string;
    code: string;
  },
): Promise<FunctionResponse<AffiliateCode, UseAffiliateCodeError>> {
  try {
    const { db } = getGlobalObject();
    const sanitizedCode = sanitizeCode(code);

    const userResult = await getRawUser({ userID });

    if (!userResult.ok) return { ok: false, error: 'notFound' };

    if (userResult.data.referralInformation.referredBy || userResult.data.referralInformation.referredByID) {
      return { ok: false, error: 'alreadyClaimed' };
    }

    const affiliateCode = await db.collection<AffiliateCode>(DatabaseCollections.affiliateCodes).findOne({
      code: sanitizedCode,
      disabledAt: {
        $exists: false,
      },
    });

    if (!affiliateCode) return { ok: false, error: 'notFound' };

    if (affiliateCode.userID === userID) return { ok: false, error: 'ownCode' };

    const updatedUser = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      {
        userID,
        'referralInformation.referredBy': {
          $exists: false,
        },
        'referralInformation.referredByID': {
          $exists: false,
        },
      },
      {
        $set: {
          'referralInformation.referredBy': sanitizedCode,
          'referralInformation.referredByID': affiliateCode.userID,
        },
      },
      {
        returnDocument: 'after',
      },
    );

    if (!updatedUser) return { ok: false, error: 'alreadyClaimed' };

    return { ok: true, data: affiliateCode };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function claimReferralEarnings(
  {
    userID,
  }: {
    userID: string;
  },
): Promise<FunctionResponse<{ user: InternalUser; transaction: InternalTransaction }, ClaimReferralEarningsError>> {
  const {
    db,
    mongoClient,
    io,
  } = getGlobalObject();

  const session = mongoClient.startSession();

  try {
    session.startTransaction();

    const userBefore = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      {
        userID,
        'referralInformation.pendingEarnings': { $gte: 1 },
      },
      [
        {
          $set: {
            'balance.sparks': { $add: [ '$balance.sparks', { $floor: '$referralInformation.pendingEarnings' } ] },
            'referralInformation.pendingEarnings': {
              $subtract: [ '$referralInformation.pendingEarnings', { $floor: '$referralInformation.pendingEarnings' } ],
            },
          },
        },
      ],
      { returnDocument: 'before', session },
    );

    if (!userBefore) throw new Error('noPendingEarnings');

    const balanceChange = Math.floor(userBefore.referralInformation.pendingEarnings);
    const balanceAfter = userBefore.balance.sparks + balanceChange;

    const now = new Date();

    const transaction: InternalTransaction = {
      transactionID: createId(),
      userID,
      balanceType: 'sparks',
      balanceChange,
      balanceAfter,
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await db.collection<InternalTransaction>(DatabaseCollections.userTransactions).insertOne(
      transaction,
      { session },
    );

    if (!insertResult.acknowledged) throw new Error('internalServerError');

    await session.commitTransaction();

    io.to(userID).emit(SocketEmits.userBalanceChange, balanceAfter);

    return { ok: true, data: { user: userBefore, transaction } };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    if (error instanceof Error && error.message === 'noPendingEarnings') {
      return { ok: false, error: 'noPendingEarnings' };
    }

    console.error(error);

    return { ok: false, error: 'internalServerError' };
  } finally {
    await session.endSession();
  }
}

function sanitizeCode(code: string): string {
  return code.trim().toLowerCase();
}
