import { createId } from '@paralleldrive/cuid2';

// Constants
import DatabaseCollections from '../constants/DatabaseCollections';
import SocketEmits from '../constants/SocketEmits';

// Utils
import { getGlobalObject } from './globalObject';
import { createUserNotification } from './notifications';
import { SPARKS_PER_USD } from './rewards';
import { updateUserBalance } from './user';

// Types
import type InternalUser from 'types/InternalUser';
import type InternalReward from 'types/Reward/InternalReward';
import type InternalRedemption from 'types/Redemption/InternalRedemption';
import type { RequestedCCPaymentInternalRedemption } from 'types/Redemption/CCPaymentInternalRedemption';
import type { RequestedTremendousInternalRedemption } from 'types/Redemption/TremendousInternalRedemption';
import type FunctionResponse from 'types/FunctionResponse';

export type HandlePurchaseError =
  | 'insufficientBalance'
  | 'invalidWalletAddress'
  | 'invalidCurrencyCode'
  | 'internalServerError';

type BuildRedemptionResult =
  | { ok: true, data: InternalRedemption }
  | { ok: false, error: Exclude<HandlePurchaseError, 'insufficientBalance' | 'internalServerError'> };

function buildRedemption({
  user,
  reward,
  value,
  walletAddress,
  currencyCode,
}: {
  user: InternalUser;
  reward: InternalReward;
  value: number;
  walletAddress?: unknown;
  currencyCode?: unknown;
}): BuildRedemptionResult {
  const now = new Date();
  const base = {
    redemptionID: createId(),
    userID: user.userID,
    rewardID: reward.rewardID,
    itemName: reward.rewardName,
    status: 'pending' as const,
    createdAt: now,
    updatedAt: now,
  };

  switch (reward.providerName) {
    case 'ccpayment': {
      if (typeof walletAddress !== 'string' || walletAddress.trim().length === 0) {
        return { ok: false, error: 'invalidWalletAddress' };
      }

      const redemption: RequestedCCPaymentInternalRedemption = {
        ...base,
        providerName: 'ccpayment',
        value,
        usdValue: value / SPARKS_PER_USD,
        meta: {
          walletAddress: walletAddress.trim(),
          currencySymbol: reward.meta.currencySymbol,
          currencyNetwork: reward.meta.currencyNetwork,
          currencyRate: 1,
        },
      };

      return { ok: true, data: redemption };
    }
    case 'tremendous': {
      const resolvedCurrencyCode = typeof currencyCode === 'string' && currencyCode.length > 0
        ? currencyCode
        : 'USD';

      if (!reward.meta.currencyCodes.includes(resolvedCurrencyCode)) {
        return { ok: false, error: 'invalidCurrencyCode' };
      }

      const redemption: RequestedTremendousInternalRedemption = {
        ...base,
        providerName: 'tremendous',
        value,
        usdValue: value,
        meta: {
          requestCurrencyCode: resolvedCurrencyCode,
          requestRewardAmount: value,
          requestUsdValue: value,
        },
      };

      return { ok: true, data: redemption };
    }
  }
}

export async function handlePurchase({
  user,
  reward,
  value,
  sparksCost,
  walletAddress,
  currencyCode,
}: {
  user: InternalUser;
  reward: InternalReward;
  value: number;
  sparksCost: number;
  walletAddress?: unknown;
  currencyCode?: unknown;
}): Promise<FunctionResponse<InternalRedemption, HandlePurchaseError>> {
  const redemptionResult = buildRedemption({
    user,
    reward,
    value,
    walletAddress,
    currencyCode,
  });

  if (!redemptionResult.ok) {
    return redemptionResult;
  }

  const { db, mongoClient, io } = getGlobalObject();
  const session = mongoClient.startSession();

  try {
    session.startTransaction();

    const balanceResult = await updateUserBalance({
      userID: user.userID,
      balanceChange: -sparksCost,
      inc: {
        'statistics.withdrawn': sparksCost,
      },
      minBalance: sparksCost,
      session,
    });

    if (!balanceResult.ok) {
      await session.abortTransaction();

      if (balanceResult.error === 'notFound') {
        return { ok: false, error: 'internalServerError' };
      }

      return { ok: false, error: balanceResult.error };
    }

    const redemption: InternalRedemption = {
      ...redemptionResult.data,
      correspondingTransactionID: balanceResult.data.transaction.transactionID,
    };

    const redemptionInsertResult = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).insertOne(
      redemption,
      { session },
    );

    if (!redemptionInsertResult.acknowledged) {
      throw new Error('internalServerError');
    }

    await session.commitTransaction();

    io.to(user.userID).emit(SocketEmits.userBalanceChange, balanceResult.data.user.balance.sparks);

    void createUserNotification({
      userID: user.userID,
      meta: {
        type: 'redemptionSubmitted',
        rewardName: reward.rewardName,
        value,
      },
    });

    return { ok: true, data: redemption };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error(error);

    return { ok: false, error: 'internalServerError' };
  } finally {
    await session.endSession();
  }
}
