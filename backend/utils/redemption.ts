import { createId } from '@paralleldrive/cuid2';

// Constants
import DatabaseCollections from '../constants/DatabaseCollections';
import SocketEmits from '../constants/SocketEmits';

// Utils
import { checkCCPAddressValidity } from './ccpayment';
import { getGlobalObject } from './globalObject';
import { createUserNotification } from './notifications';
import { SPARKS_PER_USD } from './rewards';
import { createTremendousOrder } from './tremendous';
import { getRawUser, updateUserBalance } from './user';

// Types
import type InternalUser from 'types/User/InternalUser';
import type InternalReward from 'types/Reward/InternalReward';
import type InternalRedemption from 'types/Redemption/InternalRedemption';
import type { RequestedCCPaymentInternalRedemption } from 'types/Redemption/CCPaymentInternalRedemption';
import type { AcceptedTremendousInternalRedemption, RequestedTremendousInternalRedemption } from 'types/Redemption/TremendousInternalRedemption';
import type FunctionResponse from 'types/FunctionResponse';
import type { ListRewards200ResponseRewardsInnerValueCurrencyCodeEnum } from 'tremendous';

export type HandlePurchaseError =
  | 'insufficientBalance'
  | 'invalidWalletAddress'
  | 'invalidCurrencyCode'
  | 'internalServerError';

export type HandleTremendousRedemptionApprovalError =
  | 'internalServerError'
  | 'invalidRedemptionStatus'
  | 'userNotFound'
  | 'missingUserEmail'
  | 'missingTremendousReward'
  | 'missingTremendousLink'
  | 'redemptionNotFound';

type NewInternalRedemption =
  | RequestedCCPaymentInternalRedemption
  | RequestedTremendousInternalRedemption;

type BuildRedemptionResult =
  | { ok: true, data: NewInternalRedemption }
  | { ok: false, error: Exclude<HandlePurchaseError, 'insufficientBalance'> };

async function buildRedemption({
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
}): Promise<BuildRedemptionResult> {
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
    case 'ccpayment':
      {
      if (typeof walletAddress !== 'string' || walletAddress.trim().length === 0) {
        return { ok: false, error: 'invalidWalletAddress' };
      }

      const trimmedAddress = walletAddress.trim();
      const validityResult = await checkCCPAddressValidity({
        chain: reward.meta.currencyNetwork,
        address: trimmedAddress,
      });

      if (!validityResult.ok) {
        return { ok: false, error: 'internalServerError' };
      }

      if (!validityResult.data.addrIsValid) {
        return { ok: false, error: 'invalidWalletAddress' };
      }

      const redemption: RequestedCCPaymentInternalRedemption = {
        ...base,
        providerName: 'ccpayment',
        value,
        usdValue: value / SPARKS_PER_USD,
        meta: {
          walletAddress: trimmedAddress,
          currencySymbol: reward.meta.currencySymbol,
          currencyNetwork: reward.meta.currencyNetwork,
          currencyRate: 1,
        },
      };

      return { ok: true, data: redemption };
    }
    case 'tremendous':
      {
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

async function shouldRedemptionBeInstant(): Promise<boolean> {
  return false;
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
  const redemptionResult = await buildRedemption({
    user,
    reward,
    value,
    walletAddress,
    currencyCode,
  });

  if (!redemptionResult.ok) return redemptionResult;

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

    if (!balanceResult.ok) throw new Error(balanceResult.error);

    const isInstant = await shouldRedemptionBeInstant();

    const redemption: NewInternalRedemption = {
      ...redemptionResult.data,
      status: isInstant ? 'approved' : 'pending',
      correspondingTransactionID: balanceResult.data.transaction.transactionID,
    };

    const redemptionInsertResult = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).insertOne(
      redemption,
      {
        session,
      },
    );

    if (!redemptionInsertResult.acknowledged) throw new Error('internalServerError');

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

export async function handleTremendousRedemptionApproval({
  redemption,
  approvedBy,
}: {
  redemption: RequestedTremendousInternalRedemption;
  approvedBy?: string;
}): Promise<FunctionResponse<AcceptedTremendousInternalRedemption, HandleTremendousRedemptionApprovalError>> {
  if (redemption.status !== 'pending' && redemption.status !== 'approved') {
    return { ok: false, error: 'invalidRedemptionStatus' };
  }

  const { db } = getGlobalObject();

  const userResult = await getRawUser({ userID: redemption.userID });

  if (!userResult.ok) {
    return userResult.error === 'notFound'
      ? { ok: false, error: 'userNotFound' }
      : { ok: false, error: 'internalServerError' };
  }

  const orderResult = await createTremendousOrder({
    name: userResult.data.username,
    email: userResult.data.emailInformation.emailAddress ?? undefined,
    amount: redemption.meta.requestRewardAmount,
    currencyCode: redemption.meta.requestCurrencyCode as ListRewards200ResponseRewardsInnerValueCurrencyCodeEnum,
    rewardID: redemption.rewardID,
    externalID: redemption.redemptionID,
  });

  if (!orderResult.ok) {
    return { ok: false, error: 'internalServerError' };
  }

  const tremendousOrder = orderResult.data.order;
  const tremendousReward = tremendousOrder.rewards?.[0];

  if (!tremendousReward?.id) {
    return { ok: false, error: 'missingTremendousReward' };
  }

  const link = tremendousReward.delivery?.link;

  if (!link) {
    return { ok: false, error: 'missingTremendousLink' };
  }

  const now = new Date();
  const acceptedRedemption: AcceptedTremendousInternalRedemption = {
    ...redemption,
    status: 'completed',
    updatedAt: now,
    approvedBy: approvedBy ?? redemption.approvedBy,
    approvedAt: redemption.approvedAt ?? now,
    meta: {
      ...redemption.meta,
      requestCurrencyCode: redemption.meta.requestCurrencyCode,
      requestRewardAmount: redemption.meta.requestRewardAmount,
      tremendousCurrency: tremendousReward.value?.currency_code ?? redemption.meta.requestCurrencyCode,
      tremendousRewardAmount: tremendousReward.value?.denomination ?? redemption.meta.requestRewardAmount,
      tremendousRewardID: tremendousReward.id,
      tremendousRewardName: redemption.itemName,
      tremendousRedemptionID: tremendousOrder.id,
      link,
    },
  };

  try {
    const redemptionUpdateResult = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).findOneAndUpdate(
      {
        redemptionID: redemption.redemptionID,
        providerName: 'tremendous',
        status: { $in: [ 'pending', 'approved' ] },
      },
      {
        $set: acceptedRedemption,
      },
      {
        returnDocument: 'after',
      },
    );

    if (!redemptionUpdateResult) {
      return { ok: false, error: 'redemptionNotFound' };
    }

    return { ok: true, data: redemptionUpdateResult as AcceptedTremendousInternalRedemption };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}