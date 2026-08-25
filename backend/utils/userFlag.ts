import { createId } from '@paralleldrive/cuid2';
import { MongoServerError } from 'mongodb';

// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';

// Types
import type FunctionResponse from 'types/FunctionResponse';
import type UserFlag from 'types/UserFlag';
import type { UserFlagMeta, UserFlagType } from 'types/UserFlag';

export type CreateUserFlagError = 'internalServerError';
export type ClearUserFlagError = 'notFound' | 'alreadyCleared' | 'internalServerError';

export async function createFlagIfAbsent(
  {
    userID,
    type,
    instanceKey,
    meta,
  }: {
    userID: string,
    type: UserFlagType,
    instanceKey: string,
    meta?: UserFlagMeta,
  },
): Promise<FunctionResponse<UserFlag, CreateUserFlagError>> {
  try {
    const { db } = getGlobalObject();
    const flag: UserFlag = {
      flagID: createId(),
      userID,
      type,
      instanceKey,
      status: 'active',
      createdAt: new Date(),
      meta: meta ?? {},
    };

    await db.collection<UserFlag>(DatabaseCollections.userFlags).insertOne(flag);

    return { ok: true, data: flag };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      try {
        const { db } = getGlobalObject();
        const existing = await db.collection<UserFlag>(DatabaseCollections.userFlags).findOne({
          userID,
          type,
          instanceKey,
        });

        if (existing) return { ok: true, data: existing };
      } catch (lookupError) {
        console.error(lookupError);
      }
    }

    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getUserFlags(
  {
    userID,
  }: {
    userID: string,
  },
): Promise<FunctionResponse<UserFlag[]>> {
  try {
    const { db } = getGlobalObject();
    const flags = await db.collection<UserFlag>(DatabaseCollections.userFlags)
      .find({ userID })
      .sort({ status: 1, createdAt: -1 })
      .toArray();

    return { ok: true, data: flags };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getActiveFlagsByUserIDs(
  {
    userIDs,
  }: {
    userIDs: string[],
  },
): Promise<FunctionResponse<UserFlag[]>> {
  try {
    if (userIDs.length === 0) return { ok: true, data: [] };

    const { db } = getGlobalObject();
    const flags = await db.collection<UserFlag>(DatabaseCollections.userFlags)
      .find({
        userID: { $in: userIDs },
        status: 'active',
      })
      .toArray();

    return { ok: true, data: flags };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function clearUserFlag(
  {
    userID,
    flagID,
    clearedBy,
  }: {
    userID: string,
    flagID: string,
    clearedBy: string,
  },
): Promise<FunctionResponse<UserFlag, ClearUserFlagError>> {
  try {
    const { db } = getGlobalObject();
    const existing = await db.collection<UserFlag>(DatabaseCollections.userFlags).findOne({
      flagID,
      userID,
    });

    if (!existing) return { ok: false, error: 'notFound' };
    if (existing.status === 'cleared') return { ok: false, error: 'alreadyCleared' };

    const now = new Date();
    const updated = await db.collection<UserFlag>(DatabaseCollections.userFlags).findOneAndUpdate(
      {
        flagID,
        userID,
        status: 'active',
      },
      {
        $set: {
          status: 'cleared',
          clearedAt: now,
          clearedBy,
        },
      },
      { returnDocument: 'after' },
    );

    if (!updated) return { ok: false, error: 'notFound' };

    return { ok: true, data: updated };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export function scheduleFraudCheck(work: Promise<unknown>): void {
  work.catch(error => {
    console.error(error);
  });
}
