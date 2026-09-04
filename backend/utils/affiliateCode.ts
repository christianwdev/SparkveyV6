import { createId } from '@paralleldrive/cuid2';

// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import SocketEmits from 'backend/constants/SocketEmits';
import SiteConfig from 'backend/config/config';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';
import { getRawUser } from 'backend/utils/user';
import { escapeRegex, isDuplicateKeyError } from 'backend/utils/mongo';

// Types
import type { Filter } from 'mongodb';
import type AffiliateCode from 'types/AffiliateCode';
import type FunctionResponse from 'types/FunctionResponse';
import type InternalUser from 'types/User/InternalUser';
import type InternalTransaction from 'types/Transactions/InternalTransaction';
import type ReferralInformation from 'types/User/Parts/ReferralInformation';

export type CreateAffiliateCodeError = 'alreadyExists' | 'internalServerError';

export type UseAffiliateCodeError = 'notFound' | 'alreadyClaimed' | 'ownCode' | 'internalServerError';

export type ClaimReferralEarningsError = 'noPendingEarnings' | 'internalServerError';

export type CreditReferrerPendingEarningsError = 'internalServerError';

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
    const sanitized = sanitizeCode(code);

    // Prevent squatting on another user's default (userID) referral code.
    if (sanitized !== sanitizeCode(userID)) {
      const reservedUser = await db.collection<InternalUser>(DatabaseCollections.users).findOne(
        { userID: sanitized },
        { projection: { userID: 1 } },
      );

      if (reservedUser) return { ok: false, error: 'alreadyExists' };
    }

    const caseCollision = await resolveActiveAffiliateCode(sanitized);
    if (caseCollision.ok) return { ok: false, error: 'alreadyExists' };
    if (caseCollision.error !== 'notFound') return { ok: false, error: 'internalServerError' };

    const affiliateCode: AffiliateCode = {
      userID,
      code: sanitized,
      totalEarnings: 0,
      tasksCompleted: 0,
      createdAt: new Date(),
    };

    const result = await db.collection<AffiliateCode>(DatabaseCollections.affiliateCodes).insertOne(affiliateCode);

    if (!result.acknowledged) return { ok: false, error: 'internalServerError' };

    return { ok: true, data: affiliateCode };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { ok: false, error: 'alreadyExists' };
    }

    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function ensureDefaultAffiliateCode(
  {
    userID,
  }: {
    userID: string,
  },
): Promise<FunctionResponse<AffiliateCode, CreateAffiliateCodeError>> {
  try {
    const existing = await resolveActiveAffiliateCode(userID);

    if (existing.ok) {
      if (existing.data.userID !== userID) return { ok: false, error: 'alreadyExists' };

      return { ok: true, data: existing.data };
    }

    if (existing.error !== 'notFound') return { ok: false, error: 'internalServerError' };

    // Default code is mandatory and may exceed maxAffiliateCodes for legacy accounts.
    return await createAffiliateCode({ userID, code: userID });
  } catch (error) {
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

    const resolved = await resolveActiveAffiliateCode(code);

    if (!resolved.ok) {
      return { ok: false, error: resolved.error === 'notFound' ? 'notFound' : 'internalServerError' };
    }

    if (resolved.data.userID !== userID) return { ok: false, error: 'notFound' };

    const affiliateCode = await db.collection<AffiliateCode>(DatabaseCollections.affiliateCodes).findOneAndUpdate(
      {
        userID,
        code: resolved.data.code,
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

export async function resolveActiveAffiliateCode(
  code: string,
): Promise<FunctionResponse<AffiliateCode>> {
  try {
    const { db } = getGlobalObject();
    const sanitized = sanitizeCode(code);
    const matches = await db.collection<AffiliateCode>(DatabaseCollections.affiliateCodes).find({
      code: {
        $regex: `^${escapeRegex(sanitized)}$`,
        $options: 'i',
      },
      disabledAt: {
        $exists: false,
      },
    }).toArray();

    if (matches.length === 0) return { ok: false, error: 'notFound' };

    // Case-sensitive unique index allows PromoCode + promocode. Prefer the oldest
    // (typically the v5 original) so a later lowercase squat cannot steal credit.
    const resolved = matches.reduce((oldest, current) => {
      const oldestTime = oldest.createdAt instanceof Date ? oldest.createdAt.getTime() : 0;
      const currentTime = current.createdAt instanceof Date ? current.createdAt.getTime() : 0;

      return currentTime < oldestTime ? current : oldest;
    });

    return { ok: true, data: resolved };
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

    const userResult = await getRawUser({ userID });

    if (!userResult.ok) return { ok: false, error: 'notFound' };

    if (isAttributedReferral(userResult.data.referralInformation)) {
      return { ok: false, error: 'alreadyClaimed' };
    }

    const affiliateCodeResult = await resolveActiveAffiliateCode(code);

    if (!affiliateCodeResult.ok) {
      return { ok: false, error: affiliateCodeResult.error === 'notFound' ? 'notFound' : 'internalServerError' };
    }

    const affiliateCode = affiliateCodeResult.data;

    if (affiliateCode.userID === userID) return { ok: false, error: 'ownCode' };

    const updatedUser = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      {
        userID,
        ...unattributedReferralFilter(),
      },
      {
        $set: {
          'referralInformation.referredBy': affiliateCode.code,
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
            'statistics.earned.affiliates': {
              $add: [
                { $ifNull: [ '$statistics.earned.affiliates', 0 ] },
                { $floor: '$referralInformation.pendingEarnings' },
              ],
            },
            'statistics.earned.total': {
              $add: [
                { $ifNull: [ '$statistics.earned.total', 0 ] },
                { $floor: '$referralInformation.pendingEarnings' },
              ],
            },
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

function isAttributedReferral(referral?: ReferralInformation | null): boolean {
  return Boolean(referral?.referredBy?.trim() || referral?.referredByID?.trim());
}

function blankReferralFieldFilter(field: 'referredBy' | 'referredByID'): Filter<InternalUser> {
  return {
    $or: [
      { [`referralInformation.${field}`]: { $exists: false } },
      { [`referralInformation.${field}`]: null },
      { [`referralInformation.${field}`]: '' },
      { [`referralInformation.${field}`]: { $regex: '^\\s+$' } },
    ],
  };
}

function unattributedReferralFilter(): Filter<InternalUser> {
  return {
    $and: [
      blankReferralFieldFilter('referredBy'),
      blankReferralFieldFilter('referredByID'),
    ],
  };
}

export async function getReferralCountByUserID(
  {
    userID,
  }: {
    userID: string,
  },
): Promise<FunctionResponse<number>> {
  try {
    const { db } = getGlobalObject();

    const totalReferrals = await db.collection<InternalUser>(DatabaseCollections.users).countDocuments({
      'referralInformation.referredByID': userID,
      deletedAt: {
        $exists: false,
      },
    });

    return { ok: true, data: totalReferrals };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function creditReferrerPendingEarnings(
  {
    referredUserID,
    amount,
  }: {
    referredUserID: string,
    amount: number,
  },
): Promise<FunctionResponse<null, CreditReferrerPendingEarningsError>> {
  try {
    if (!Number.isFinite(amount) || amount === 0) return { ok: true, data: null };

    const { db } = getGlobalObject();
    const rate = SiteConfig.referral.rate;

    if (!Number.isFinite(rate) || rate === 0) return { ok: true, data: null };

    const commission = Math.round(amount * rate);

    if (commission === 0) return { ok: true, data: null };

    const referredUserResult = await getRawUser({ userID: referredUserID });

    if (!referredUserResult.ok) return { ok: true, data: null };

    const referral = referredUserResult.data.referralInformation;
    let referredByID = referral?.referredByID?.trim() || undefined;
    const referredBy = referral?.referredBy?.trim() || undefined;
    const resolvedCode = referredBy
      ? await resolveActiveAffiliateCode(referredBy)
      : { ok: false as const, error: 'notFound' as const };

    if (!referredByID && resolvedCode.ok) {
      referredByID = resolvedCode.data.userID;
    }

    if (!referredByID) return { ok: true, data: null };

    const tasksCompletedDelta = amount > 0
      ? 1
      : amount < 0
        ? -1
        : 0;

    await db.collection<InternalUser>(DatabaseCollections.users).updateOne(
      {
        userID: referredByID,
      },
      {
        $inc: {
          'referralInformation.pendingEarnings': commission,
          'referralInformation.totalEarnings': commission,
          'referralInformation.tasksCompleted': tasksCompletedDelta,
        },
      },
    );

    const codeToCredit = resolvedCode.ok && resolvedCode.data.userID === referredByID
      ? resolvedCode.data.code
      : referredBy;

    if (codeToCredit) {
      await db.collection<AffiliateCode>(DatabaseCollections.affiliateCodes).updateOne(
        {
          userID: referredByID,
          code: codeToCredit,
          disabledAt: {
            $exists: false,
          },
        },
        {
          $inc: {
            totalEarnings: commission,
            tasksCompleted: tasksCompletedDelta,
          },
        },
      );
    }

    return { ok: true, data: null };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}
