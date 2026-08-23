import { createId } from '@paralleldrive/cuid2';
import pLimit from 'p-limit';

// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import SocketEmits from 'backend/constants/SocketEmits';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';
import { createUserNotification } from 'backend/utils/notifications';
import { updateUserBalance } from 'backend/utils/userBalance';
import { creditReferrerPendingEarnings } from 'backend/utils/affiliateCode';
import { addLeaderboardEarnings } from 'backend/utils/leaderboard';

// Types
import type { ClientSession, Filter } from 'mongodb';
import type FunctionResponse from 'types/FunctionResponse';
import type { InternalOfferEarning } from 'types/Earnings/InternalEarning';

export type ReleaseHeldOfferError =
  | 'notFound'
  | 'creditFailed'
  | 'internalServerError';

const CREDIT_RETRY_DELAY_MS = 60_000; // skip a poison hold until the next minute
const MAX_RELEASES_PER_POLL = 50;
const RELEASE_CONCURRENCY = 5; // distinct users; same user stays serial

/** Side effects for sparks earned/reversed via offer (and similar) credits. */
export async function applySparksEarningsSideEffects(
  {
    userID,
    amount,
  }: {
    userID: string,
    amount: number,
  },
): Promise<void> {
  if (!Number.isFinite(amount) || amount === 0) return;

  const [ referralResult, leaderboardResult ] = await Promise.all([
    creditReferrerPendingEarnings({ referredUserID: userID, amount }),
    addLeaderboardEarnings({ userID, amount, type: 'monthly' }),
  ]);

  if (!referralResult.ok) {
    console.error('creditReferrerPendingEarnings failed', referralResult.error);
  }

  if (!leaderboardResult.ok) {
    console.error('addLeaderboardEarnings failed', leaderboardResult.error);
  }
}

type HeldOfferClaim = {
  userID: string,
  provider: string,
  conversionID: string,
};

async function bumpHeldUntil(
  {
    provider,
    conversionID,
    retryDelayMs,
  }: {
    provider: string,
    conversionID: string,
    retryDelayMs: number,
  },
): Promise<void> {
  const { db } = getGlobalObject();

  await db.collection<InternalOfferEarning>(DatabaseCollections.userEarnings).updateOne(
    {
      provider,
      conversionID,
      status: 'held',
    },
    {
      $set: {
        heldUntil: new Date(Date.now() + retryDelayMs),
        updatedAt: new Date(),
      },
    },
  );
}

function groupClaimsByUser(rows: HeldOfferClaim[]): Map<string, HeldOfferClaim[]> {
  const byUser = new Map<string, HeldOfferClaim[]>();

  for (const row of rows) {
    const existing = byUser.get(row.userID) ?? [];
    existing.push(row);
    byUser.set(row.userID, existing);
  }

  return byUser;
}

async function claimAndCreditHeldOffer(
  {
    filter,
    session: externalSession,
    retryDelayMs,
  }: {
    filter: Filter<InternalOfferEarning>,
    session?: ClientSession,
    retryDelayMs?: number,
  },
): Promise<FunctionResponse<InternalOfferEarning, ReleaseHeldOfferError>> {
  const { db, mongoClient, io } = getGlobalObject();
  const ownsSession = externalSession === undefined;
  const session = externalSession ?? mongoClient.startSession();

  try {
    session.startTransaction();
    const now = new Date();
    const transactionID = createId();

    const previous = await db.collection<InternalOfferEarning>(DatabaseCollections.userEarnings).findOneAndUpdate(
      filter,
      {
        $set: {
          status: 'completed',
          correspondingTransactionID: transactionID,
          updatedAt: now,
        },
        $unset: {
          heldUntil: '',
        },
      },
      {
        returnDocument: 'before',
        session,
      },
    );

    if (!previous) {
      await session.abortTransaction();

      return { ok: false, error: 'notFound' };
    }

    const credit = await updateUserBalance({
      userID: previous.userID,
      balanceChange: previous.value,
      inc: {
        'statistics.earned.offers': previous.value,
        'statistics.earned.total': previous.value,
      },
      session,
      transactionID,
    });

    if (!credit.ok) {
      await session.abortTransaction();

      if (retryDelayMs !== undefined) {
        try {
          await bumpHeldUntil({
            provider: previous.provider,
            conversionID: previous.conversionID,
            retryDelayMs,
          });
        } catch (error) {
          console.error(
            `Failed to delay retry for held offer ${previous.provider}/${previous.conversionID}`,
            error,
          );
        }
      }

      console.error(
        `Failed to credit held offer ${previous.provider}/${previous.conversionID}:`,
        credit.error,
      );

      return { ok: false, error: 'creditFailed' };
    }

    await session.commitTransaction();

    io.to(previous.userID).emit(SocketEmits.userBalanceChange, credit.data.user.balance.sparks);

    applySparksEarningsSideEffects({
      userID: previous.userID,
      amount: previous.value,
    }).catch(error => {
      console.error(error);
    });

    createUserNotification({
      userID: previous.userID,
      meta: {
        type: 'offerReleased',
        offerValue: previous.value,
        provider: previous.provider,
        offerName: previous.offerDisplayName || previous.offerName,
      },
    }).catch(error => {
      console.error(error);
    });

    const completed: InternalOfferEarning = {
      ...previous,
      status: 'completed',
      updatedAt: now,
      correspondingTransactionID: transactionID,
    };
    completed.heldUntil = undefined;

    return { ok: true, data: completed };
  } catch (error) {
    console.error(error);

    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error(abortError);
      }
    }

    return { ok: false, error: 'internalServerError' };
  } finally {
    if (ownsSession) await session.endSession();
  }
}

async function releaseHeldOffersForUser(
  {
    rows,
    retryDelayMs,
  }: {
    rows: HeldOfferClaim[],
    retryDelayMs: number,
  },
): Promise<void> {
  const { mongoClient } = getGlobalObject();
  const session = mongoClient.startSession();

  try {
    for (const row of rows) {
      await claimAndCreditHeldOffer({
        filter: {
          type: 'offer',
          status: 'held',
          provider: row.provider,
          conversionID: row.conversionID,
          heldUntil: {
            $lte: new Date(),
          },
        },
        session,
        retryDelayMs,
      });
    }
  } finally {
    await session.endSession();
  }
}

export async function releaseHeldOfferEarning(
  {
    conversionID,
    provider,
  }: {
    conversionID: string,
    provider: string,
  },
): Promise<FunctionResponse<InternalOfferEarning, ReleaseHeldOfferError>> {
  return claimAndCreditHeldOffer({
    filter: {
      type: 'offer',
      status: 'held',
      provider,
      conversionID,
    },
  });
}

export async function pollExpiredHeldOfferEarnings(): Promise<boolean> {
  try {
    const { db } = getGlobalObject();
    const now = new Date();

    const expired = await db.collection<InternalOfferEarning>(DatabaseCollections.userEarnings)
      .find({
        type: 'offer',
        status: 'held',
        heldUntil: {
          $lte: now,
        },
      })
      .project<HeldOfferClaim>({
        _id: 0,
        userID: 1,
        provider: 1,
        conversionID: 1,
      })
      .sort({ heldUntil: 1 })
      .limit(MAX_RELEASES_PER_POLL)
      .toArray();

    if (expired.length === 0) return false;

    const byUser = groupClaimsByUser(expired);
    const limit = pLimit(RELEASE_CONCURRENCY);

    await Promise.all([ ...byUser.values() ].map(rows => limit(() => (
      releaseHeldOffersForUser({
        rows,
        retryDelayMs: CREDIT_RETRY_DELAY_MS,
      })
    ))));

    return false;
  } catch (error) {
    console.error(error);

    return true;
  }
}
