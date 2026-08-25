import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import SiteConfig from 'backend/config/config';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';
import { LockError } from 'backend/utils/distributedLock';
import { updateUserBalance } from 'backend/utils/userBalance';

// Types
import type FunctionResponse from 'types/FunctionResponse';
import type InternalLeaderboard from 'types/InternalLeaderboard';
import type SanitizedLeaderboard from 'types/SanitizedLeaderboard';
import type InternalUser from 'types/User/InternalUser';

dayjs.extend(utc);

const LEADERBOARD_PAYOUT_LOCK_TTL_MS = 60_000;

type LeaderboardUserEntry = {
  userID: string,
  earned: number,
};

export type GetLeaderboardError = 'invalidType' | 'internalServerError';
export type AddLeaderboardEarningsError = 'invalidType' | 'internalServerError';
export type PayoutLeaderboardEarningsError =
  | 'invalidLeaderboardID'
  | 'notFoundOrAlreadyPaid'
  | 'lockUnavailable'
  | 'internalServerError';

function normalizeLeaderboardUsers(
  users: InternalLeaderboard['users'] | LeaderboardUserEntry[] | undefined,
): LeaderboardUserEntry[] {
  if (!users) return [];

  const entries = Array.isArray(users) ? users : Object.values(users);
  const byUserID = new Map<string, number>();

  for (const entry of entries) {
    if (entry === undefined || entry === null || entry.constructor !== Object) continue;
    if (entry.userID === undefined || entry.userID === null || entry.userID.constructor !== String) continue;

    const userID = entry.userID;
    const earned = Number.isFinite(entry.earned) ? entry.earned : 0;

    if (!userID) continue;

    byUserID.set(userID, Math.max(byUserID.get(userID) ?? 0, earned));
  }

  return Array.from(byUserID.entries()).map(([ userID, earned ]) => ({
    userID,
    earned,
  }));
}

function getLeaderboardDateContext(type: InternalLeaderboard['type']): {
  leaderboardID: string,
  startDate: Date,
  endDate: Date,
} | null {
  if (type === 'weekly') {
    return {
      leaderboardID: dayjs.utc().startOf('week').format('MM/DD/YYYY'),
      startDate: dayjs.utc().startOf('week').toDate(),
      endDate: dayjs.utc().endOf('week').toDate(),
    };
  }

  if (type === 'monthly') {
    return {
      leaderboardID: dayjs.utc().startOf('month').format('MM/DD/YYYY'),
      startDate: dayjs.utc().startOf('month').toDate(),
      endDate: dayjs.utc().endOf('month').toDate(),
    };
  }

  return null;
}

export async function getLeaderboard(
  {
    type,
  }: {
    type: InternalLeaderboard['type'],
  },
): Promise<FunctionResponse<InternalLeaderboard | null, GetLeaderboardError>> {
  try {
    const dateContext = getLeaderboardDateContext(type);

    if (!dateContext) return { ok: false, error: 'invalidType' };

    const { db } = getGlobalObject();
    const leaderboard = await db.collection<InternalLeaderboard>(DatabaseCollections.leaderboards).findOne({
      type,
      leaderboardID: dateContext.leaderboardID,
    });

    return { ok: true, data: leaderboard };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getSanitizedLeaderboard(
  {
    type,
  }: {
    type: InternalLeaderboard['type'],
  },
): Promise<FunctionResponse<SanitizedLeaderboard | null, GetLeaderboardError>> {
  try {
    const dateContext = getLeaderboardDateContext(type);

    if (!dateContext) return { ok: false, error: 'invalidType' };

    const { db } = getGlobalObject();
    const leaderboard = await db.collection<InternalLeaderboard>(DatabaseCollections.leaderboards).findOne({
      type,
      leaderboardID: dateContext.leaderboardID,
    });

    if (!leaderboard) return { ok: true, data: null };

    const topUsers = normalizeLeaderboardUsers(leaderboard.users)
      .sort((a, b) => b.earned - a.earned)
      .slice(0, 10);

    const dbUsers = await db.collection<InternalUser>(DatabaseCollections.users).find({
      userID: {
        $in: topUsers.map(user => user.userID),
      },
    }).toArray();

    const sanitizedTopUsers = topUsers.map(user => {
      const dbUser = dbUsers.find(entry => entry.userID === user.userID);

      return {
        userID: user.userID,
        earned: user.earned,
        username: dbUser?.username ?? undefined,
        avatar: dbUser?.avatar || undefined,
      };
    });

    return {
      ok: true,
      data: {
        ...leaderboard,
        users: sanitizedTopUsers,
      },
    };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function addLeaderboardEarnings(
  {
    userID,
    amount,
    type,
  }: {
    userID: string,
    amount: number,
    type: InternalLeaderboard['type'],
  },
): Promise<FunctionResponse<null, AddLeaderboardEarningsError>> {
  try {
    if (!Number.isFinite(amount) || amount === 0) return { ok: true, data: null };

    const dateContext = getLeaderboardDateContext(type);

    if (!dateContext) return { ok: false, error: 'invalidType' };

    const { db } = getGlobalObject();

    await db.collection<InternalLeaderboard>(DatabaseCollections.leaderboards).updateOne(
      {
        type,
        leaderboardID: dateContext.leaderboardID,
      },
      {
        $inc: {
          [`users.${userID}.earned`]: amount,
        },
        $set: {
          [`users.${userID}.userID`]: userID,
        },
        $setOnInsert: {
          leaderboardID: dateContext.leaderboardID,
          type,
          startDate: dateContext.startDate,
          endDate: dateContext.endDate,
          prizes: SiteConfig.leaderboard.prizes || [],
        },
      },
      {
        upsert: true,
      },
    );

    return { ok: true, data: null };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function payoutLeaderboardEarnings(
  {
    type,
    leaderboardID,
  }: {
    type: InternalLeaderboard['type'],
    leaderboardID: string,
  },
): Promise<FunctionResponse<null, PayoutLeaderboardEarningsError>> {
  if (!leaderboardID) return { ok: false, error: 'invalidLeaderboardID' };

  const { db, distributedLock } = getGlobalObject();

  if (!distributedLock) return { ok: false, error: 'lockUnavailable' };

  const lockKey = `leaderboard:payout:${type}:${leaderboardID}`;

  try {
    await distributedLock(
      async () => {
        const leaderboard = await db.collection<InternalLeaderboard>(DatabaseCollections.leaderboards).findOne({
          type,
          leaderboardID,
          payoutDate: {
            $exists: false,
          },
        });

        if (!leaderboard) throw new Error('notFoundOrAlreadyPaid');

        const prizes = leaderboard.prizes || SiteConfig.leaderboard.prizes;
        const paidUserIDs = new Set(leaderboard.paidUserIDs ?? []);

        const topUsers = normalizeLeaderboardUsers(leaderboard.users)
          .filter(user => user.earned > 0)
          .sort((a, b) => b.earned - a.earned)
          .slice(0, prizes.length);

        let payoutFailed = false;

        for (let i = 0; i < topUsers.length; i++) {
          const user = topUsers[i];
          const prize = prizes[i];

          if (!Number.isFinite(prize) || prize <= 0) continue;
          if (paidUserIDs.has(user.userID)) continue;

          const payResult = await updateUserBalance({
            userID: user.userID,
            balanceChange: prize,
            inc: {
              'statistics.earned.bonus': prize,
              'statistics.earned.total': prize,
            },
          });

          if (!payResult.ok) {
            console.error(`Leaderboard payout failed for ${user.userID} on ${type}/${leaderboardID}:`, payResult.error);
            payoutFailed = true;
            continue;
          }

          paidUserIDs.add(user.userID);
          await db.collection<InternalLeaderboard>(DatabaseCollections.leaderboards).updateOne(
            {
              type,
              leaderboardID,
            },
            {
              $addToSet: {
                paidUserIDs: user.userID,
              },
            },
          );
        }

        if (payoutFailed) throw new Error('partialPayoutFailure');

        const claimed = await db.collection<InternalLeaderboard>(DatabaseCollections.leaderboards).findOneAndUpdate(
          {
            type,
            leaderboardID,
            payoutDate: {
              $exists: false,
            },
          },
          {
            $set: {
              payoutDate: dayjs.utc().toDate(),
            },
          },
          {
            returnDocument: 'after',
          },
        );

        if (!claimed) throw new Error('notFoundOrAlreadyPaid');
      },
      { key: lockKey, ttlMs: LEADERBOARD_PAYOUT_LOCK_TTL_MS },
    );

    return { ok: true, data: null };
  } catch (error) {
    if (error instanceof LockError) return { ok: false, error: 'lockUnavailable' };

    if (error instanceof Error) {
      if (error.message === 'notFoundOrAlreadyPaid') {
        return { ok: false, error: 'notFoundOrAlreadyPaid' };
      }

      if (error.message === 'partialPayoutFailure') {
        return { ok: false, error: 'internalServerError' };
      }
    }

    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}
