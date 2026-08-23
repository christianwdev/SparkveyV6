import { createId } from '@paralleldrive/cuid2';
import { getGlobalObject } from 'backend/utils/globalObject';
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import SocketEmits from 'backend/constants/SocketEmits';

// Types
import type { ClientSession, Filter } from 'mongodb';
import type FunctionResponse from 'types/FunctionResponse';
import type InternalUser from 'types/User/InternalUser';
import type InternalTransaction from 'types/Transactions/InternalTransaction';

export type UserDocumentIncrement = {
  [K in keyof InternalUser['statistics']['earned'] as `statistics.earned.${K}`]?: number;
} & {
  'statistics.withdrawn'?: number;
};

export type UpdateUserBalanceError = 'notFound' | 'insufficientBalance' | 'internalServerError';

export type UpdateUserBalanceAfterCommit = (args: {
  userID: string,
  balanceType: keyof InternalUser['balance'],
  balanceChange: number,
  user: InternalUser,
  transaction: InternalTransaction,
}) => void | Promise<void>;

export async function updateUserBalance({
  userID,
  balanceType = 'sparks',
  balanceChange,
  inc,
  minBalance,
  session: externalSession,
  afterCommit,
  transactionID: suppliedTransactionID,
}: {
  userID: string;
  balanceType?: keyof InternalUser['balance'];
  balanceChange: number;
  inc?: UserDocumentIncrement;
  minBalance?: number;
  session?: ClientSession;
  afterCommit?: UpdateUserBalanceAfterCommit;
  transactionID?: string;
}): Promise<FunctionResponse<{ user: InternalUser; transaction: InternalTransaction }, UpdateUserBalanceError>> {
  const { db, mongoClient, io } = getGlobalObject();
  const ownsSession = externalSession === undefined;
  const session = externalSession ?? mongoClient.startSession();

  try {
    if (ownsSession) {
      session.startTransaction();
    }

    const filter: Filter<InternalUser> = { userID };

    if (minBalance !== undefined) {
      filter[`balance.${balanceType}`] = { $gte: minBalance };
    }

    const user = await db.collection<InternalUser>(DatabaseCollections.users).findOneAndUpdate(
      filter,
      {
        $inc: {
          [`balance.${balanceType}`]: balanceChange,
          ...inc,
        },
      },
      {
        returnDocument: 'after',
        session,
      },
    );

    if (!!minBalance && !user) throw new Error('insufficientBalance');
    if (!user) throw new Error('notFound');

    const now = new Date();
    const transaction: InternalTransaction = {
      transactionID: suppliedTransactionID ?? createId(),
      userID,
      balanceType,
      balanceChange,
      balanceAfter: user.balance[balanceType],
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await db.collection<InternalTransaction>(DatabaseCollections.userTransactions).insertOne(
      transaction,
      { session },
    );

    if (!insertResult.acknowledged) throw new Error('internalServerError');

    if (ownsSession) {
      await session.commitTransaction();
      io.to(userID).emit(SocketEmits.userBalanceChange, user.balance[balanceType]);

      // Balance is already committed — await so callers finish after side effects,
      // but never fail the credit if afterCommit throws (would double-pay on retry).
      if (afterCommit) {
        try {
          await afterCommit({
            userID,
            balanceType,
            balanceChange,
            user,
            transaction,
          });
        } catch (error) {
          console.error('updateUserBalance afterCommit failed', error);
        }
      }
    }

    return { ok: true, data: { user, transaction } };
  } catch (error) {
    if (ownsSession && session.inTransaction()) {
      await session.abortTransaction();
    }

    if (error instanceof Error) {
      if (error.message === 'notFound') return { ok: false, error: 'notFound' };
      if (error.message === 'insufficientBalance') return { ok: false, error: 'insufficientBalance' };
    }

    console.error(error);

    return { ok: false, error: 'internalServerError' };
  } finally {
    if (ownsSession) {
      await session.endSession();
    }
  }
}
