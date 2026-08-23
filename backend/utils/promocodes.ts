import { MongoServerError } from 'mongodb';
import { getGlobalObject } from 'backend/utils/globalObject';
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import SocketEmits from 'backend/constants/SocketEmits';

// Utils
import { updateUserBalance } from 'backend/utils/userBalance';

// Types
import type FunctionResponse from 'types/FunctionResponse';
import type InternalPromocode from 'types/InternalPromocode';

const ADMIN_PROMOCODES_PAGE_SIZE = 10;

export type ListPromocodesError = 'internalServerError';

export type CreatePromocodeError = 'alreadyExists' | 'internalServerError';

export type DeletePromocodeError = 'notFound' | 'internalServerError';

export type ClaimPromocodeError = 'invalidOrUnavailable' | 'internalServerError';

export async function listPromocodes(
  {
    limit = ADMIN_PROMOCODES_PAGE_SIZE,
    offset = 0,
  }: {
    limit?: number,
    offset?: number,
  } = {},
): Promise<FunctionResponse<{ promocodes: InternalPromocode[], total: number }, ListPromocodesError>> {
  try {
    const { db } = getGlobalObject();
    const collection = db.collection<InternalPromocode>(DatabaseCollections.promocodes);

    const [ promocodes, total ] = await Promise.all([
      collection
        .find({})
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      collection.countDocuments({}),
    ]);

    return { ok: true, data: { promocodes, total } };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function createPromocode(
  {
    code,
    totalUses,
    expiryDate,
    rewardValue,
  }: {
    code: string,
    totalUses: number,
    expiryDate: Date,
    rewardValue: number,
  },
): Promise<FunctionResponse<InternalPromocode, CreatePromocodeError>> {
  try {
    const { db } = getGlobalObject();
    const sanitized = sanitizeCode(code);

    const promocode: InternalPromocode = {
      code: sanitized,
      totalUses,
      uses: totalUses,
      expiryDate,
      createdAt: new Date(),
      reward: {
        type: 'sparks',
        value: rewardValue,
      },
      claimedBy: [],
    };

    const result = await db.collection<InternalPromocode>(DatabaseCollections.promocodes).insertOne(promocode);

    if (!result.acknowledged) return { ok: false, error: 'internalServerError' };

    return { ok: true, data: promocode };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return { ok: false, error: 'alreadyExists' };
    }

    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function deletePromocode(
  {
    code,
  }: {
    code: string,
  },
): Promise<FunctionResponse<{ code: string }, DeletePromocodeError>> {
  try {
    const { db } = getGlobalObject();
    const sanitized = sanitizeCode(code);

    const result = await db.collection<InternalPromocode>(DatabaseCollections.promocodes).findOneAndUpdate(
      { code: sanitized },
      {
        $set: {
          disabled: true,
          uses: 0,
        },
      },
    );

    if (!result) return { ok: false, error: 'notFound' };

    return { ok: true, data: { code: sanitized } };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function claimPromocode(
  {
    userID,
    code,
  }: {
    userID: string,
    code: string,
  },
): Promise<FunctionResponse<{ amount: number, sparks: number }, ClaimPromocodeError>> {
  const {
    db,
    mongoClient,
    io,
  } = getGlobalObject();
  const sanitized = sanitizeCode(code);
  const session = mongoClient.startSession();

  try {
    session.startTransaction();

    const now = new Date();
    const claimed = await db.collection<InternalPromocode>(DatabaseCollections.promocodes).findOneAndUpdate(
      {
        code: sanitized,
        disabled: { $ne: true },
        uses: { $gt: 0 },
        expiryDate: { $gt: now },
        claimedBy: { $ne: userID },
      },
      {
        $inc: { uses: -1 },
        $addToSet: { claimedBy: userID },
      },
      {
        returnDocument: 'after',
        session,
      },
    );

    if (!claimed) throw new Error('claimRejected');

    if (claimed.reward.type !== 'sparks' || !Number.isFinite(claimed.reward.value) || claimed.reward.value <= 0) {
      throw new Error('internalServerError');
    }

    const balanceResult = await updateUserBalance({
      userID,
      balanceChange: claimed.reward.value,
      session,
    });

    if (!balanceResult.ok) throw new Error('internalServerError');

    await session.commitTransaction();

    try {
      io.to(userID).emit(SocketEmits.balanceUpdate, balanceResult.data.user.balance);
    } catch (emitError) {
      console.error(emitError);
    }

    return { ok: true, data: { amount: claimed.reward.value, sparks: balanceResult.data.user.balance.sparks } };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    if (error instanceof Error && error.message === 'claimRejected') {
      return { ok: false, error: 'invalidOrUnavailable' };
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
