import { createId } from '@paralleldrive/cuid2';

// Constants
import DatabaseCollections from '../constants/DatabaseCollections';
import SocketEmits from '../constants/SocketEmits';

// Utils
import { checkCCPAddressValidity, getCoinList, withdrawCCP } from './ccpayment';
import type { CCPaymentCoinList, CCPaymentCoinListItem } from './ccpayment';
import { detectSharedWithdrawalAddress } from './fraud';
import { getGlobalObject } from './globalObject';
import { createUserNotification } from './notifications';
import { getRedemptionSparksValue, getRedemptionUsdValue, getRewardByID, getRewardFeeAmount, getRewardFeeRate } from './rewards';
import { createTremendousOrder } from './tremendous';
import { getRawUser } from './user';
import { scheduleFraudCheck } from './userFlag';
import { updateUserBalance } from './userBalance';

// Types
import type InternalUser from 'types/User/InternalUser';
import type InternalReward from 'types/Reward/InternalReward';
import type InternalRedemption from 'types/Redemption/InternalRedemption';
import type {
  AcceptedCCPaymentInternalRedemption,
  RequestedCCPaymentInternalRedemption,
} from 'types/Redemption/CCPaymentInternalRedemption';
import type { AcceptedTremendousInternalRedemption, RequestedTremendousInternalRedemption } from 'types/Redemption/TremendousInternalRedemption';
import type InternalTransaction from 'types/Transactions/InternalTransaction';
import type FunctionResponse from 'types/FunctionResponse';
import type { ListRewards200ResponseRewardsInnerValueCurrencyCodeEnum } from 'tremendous';

export type HandlePurchaseError =
  | 'insufficientBalance'
  | 'invalidWalletAddress'
  | 'invalidCurrencyCode'
  | 'internalServerError';

export type HandleCCPaymentRedemptionApprovalError =
  | 'internalServerError'
  | 'invalidRedemptionStatus'
  | 'missingCoinId'
  | 'redemptionNotFound';

export type HandleRedemptionRejectionError =
  | 'internalServerError'
  | 'invalidRedemptionStatus'
  | 'missingLedgerTransaction'
  | 'redemptionNotFound';

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
  const sparksValue = getRedemptionSparksValue(reward, value);
  const usdValue = getRedemptionUsdValue(reward, value);

  if (sparksValue === null || usdValue === null) {
    return { ok: false, error: 'internalServerError' };
  }
  const feeRate = getRewardFeeRate(reward);
  const requestFeeAmount = getRewardFeeAmount({ value, feeRate });
  const base = {
    redemptionID: createId(),
    userID: user.userID,
    rewardID: reward.rewardID,
    itemName: reward.rewardName,
    value: sparksValue,
    usdValue,
    status: 'pending' as const,
    createdAt: now,
    updatedAt: now,
  };

  switch (reward.providerName) {
    case 'ccpayment':
      {
      if (walletAddress === undefined || walletAddress === null || walletAddress.constructor !== String) {
        return { ok: false, error: 'invalidWalletAddress' };
      }

      const trimmedAddress = String(walletAddress).trim();
      if (trimmedAddress.length === 0) {
        return { ok: false, error: 'invalidWalletAddress' };
      }
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
        meta: {
          walletAddress: trimmedAddress,
          currencySymbol: reward.meta.currencySymbol,
          currencyNetwork: reward.meta.currencyNetwork,
          currencyRate: 1,
          requestRewardAmount: value,
          requestFeeAmount,
        },
      };

      return { ok: true, data: redemption };
    }
    case 'tremendous':
      {
      const primaryCurrencyCode = reward.meta.currencyCode
        ?? reward.meta.currencyCodes[0]
        ?? 'USD';

      // Pricing is baked for the primary currency only — ignore client overrides.
      if (currencyCode !== undefined && currencyCode !== null && currencyCode.constructor === String) {
        const requestedCurrencyCode = String(currencyCode);
        if (
          requestedCurrencyCode.length > 0
          && requestedCurrencyCode.toUpperCase() !== primaryCurrencyCode.toUpperCase()
        ) {
          return { ok: false, error: 'invalidCurrencyCode' };
        }
      }

      const redemption: RequestedTremendousInternalRedemption = {
        ...base,
        providerName: 'tremendous',
        meta: {
          requestCurrencyCode: primaryCurrencyCode,
          requestRewardAmount: value,
          requestFeeAmount,
          requestUsdValue: usdValue,
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

    if (redemption.providerName === 'ccpayment') {
      scheduleFraudCheck(detectSharedWithdrawalAddress({
        userID: user.userID,
        walletAddress: redemption.meta.walletAddress,
      }));
    }

    io.to(user.userID).emit(SocketEmits.userBalanceChange, balanceResult.data.user.balance.sparks);

    createUserNotification({
      userID: user.userID,
      meta: {
        type: 'redemptionSubmitted',
        rewardName: reward.rewardName,
        value: redemption.value,
      },
    }).catch(error => {
      console.error(error);
    });

    return { ok: true, data: redemption };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    if (error instanceof Error && error.message === 'insufficientBalance') {
      return { ok: false, error: 'insufficientBalance' };
    }

    console.error(error);

    return { ok: false, error: 'internalServerError' };
  } finally {
    await session.endSession();
  }
}

async function releaseTremendousClaim(
  redemptionID: string,
  previousStatus: 'pending' | 'approved',
) {
  const { db } = getGlobalObject();

  await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).updateOne(
    { redemptionID, providerName: 'tremendous', status: 'processing' },
    { $set: { status: previousStatus, updatedAt: new Date() } },
  );
}

async function failTremendousProcessing(
  redemptionID: string,
  meta: RequestedTremendousInternalRedemption['meta'],
) {
  const { db } = getGlobalObject();

  // Never roll back to pending/approved after a provider order may exist —
  // keep provider IDs on a failed row for reconciliation.
  await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).updateOne(
    { redemptionID, providerName: 'tremendous', status: 'processing' },
    {
      $set: {
        status: 'failed',
        updatedAt: new Date(),
        meta,
      },
    },
  );
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
  const now = new Date();
  const previousStatus = redemption.status;

  // Claim first so concurrent approvals cannot create multiple Tremendous orders.
  const claimed = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).findOneAndUpdate(
    {
      redemptionID: redemption.redemptionID,
      providerName: 'tremendous',
      status: { $in: [ 'pending', 'approved' ] },
    },
    {
      $set: {
        status: 'processing',
        updatedAt: now,
        approvedBy: approvedBy ?? redemption.approvedBy,
        approvedAt: redemption.approvedAt ?? now,
      },
    },
    { returnDocument: 'after' },
  );

  if (!claimed) {
    return { ok: false, error: 'redemptionNotFound' };
  }

  const userResult = await getRawUser({ userID: redemption.userID });

  if (!userResult.ok) {
    await releaseTremendousClaim(redemption.redemptionID, previousStatus);

    return userResult.error === 'notFound'
      ? { ok: false, error: 'userNotFound' }
      : { ok: false, error: 'internalServerError' };
  }

  const orderResult = await createTremendousOrder({
    name: userResult.data.username,
    email: userResult.data.emailInformation.emailAddress ?? undefined,
    amount: redemption.meta.requestRewardAmount,
    // SAFETY: requestCurrencyCode is the Tremendous ISO code stored on the reward at ingest.
    currencyCode: redemption.meta.requestCurrencyCode as ListRewards200ResponseRewardsInnerValueCurrencyCodeEnum,
    rewardID: redemption.rewardID,
    externalID: redemption.redemptionID,
  });

  if (!orderResult.ok) {
    await releaseTremendousClaim(redemption.redemptionID, previousStatus);

    return { ok: false, error: 'internalServerError' };
  }

  const tremendousOrder = orderResult.data.order;
  const tremendousReward = tremendousOrder.rewards?.[0];
  const providerMetaBase = {
    ...redemption.meta,
    requestCurrencyCode: redemption.meta.requestCurrencyCode,
    requestRewardAmount: redemption.meta.requestRewardAmount,
    tremendousRedemptionID: tremendousOrder.id,
  };

  if (!tremendousReward?.id) {
    await failTremendousProcessing(redemption.redemptionID, {
      ...providerMetaBase,
      failureReason: 'missingTremendousReward',
    });

    return { ok: false, error: 'missingTremendousReward' };
  }

  const link = tremendousReward.delivery?.link;

  if (!link) {
    await failTremendousProcessing(redemption.redemptionID, {
      ...providerMetaBase,
      tremendousRewardID: tremendousReward.id,
      tremendousCurrency: tremendousReward.value?.currency_code ?? redemption.meta.requestCurrencyCode,
      tremendousRewardAmount: tremendousReward.value?.denomination ?? redemption.meta.requestRewardAmount,
      tremendousRewardName: redemption.itemName,
      failureReason: 'missingTremendousLink',
    });

    return { ok: false, error: 'missingTremendousLink' };
  }

  const acceptedRedemption: AcceptedTremendousInternalRedemption = {
    ...redemption,
    status: 'completed',
    updatedAt: new Date(),
    approvedBy: approvedBy ?? redemption.approvedBy ?? claimed.approvedBy,
    approvedAt: redemption.approvedAt ?? claimed.approvedAt ?? now,
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
        status: 'processing',
      },
      {
        $set: acceptedRedemption,
      },
      {
        returnDocument: 'after',
      },
    );

    if (!redemptionUpdateResult) {
      // Provider order exists — persist completed payload fields on failed row for ops.
      await failTremendousProcessing(redemption.redemptionID, {
        ...acceptedRedemption.meta,
        failureReason: 'completionWriteMissed',
      });

      return { ok: false, error: 'redemptionNotFound' };
    }

    return { ok: true, data: acceptedRedemption };
  } catch (error) {
    console.error(error);

    await failTremendousProcessing(redemption.redemptionID, {
      ...acceptedRedemption.meta,
      failureReason: 'completionWriteError',
    });

    return { ok: false, error: 'internalServerError' };
  }
}

const coinIdCache = new Map<string, string>();

function coinListItems(payload: CCPaymentCoinListItem[] | CCPaymentCoinList): CCPaymentCoinListItem[] {
  if (Array.isArray(payload)) return payload;
  if (payload.coins !== undefined && Array.isArray(payload.coins)) return payload.coins;

  return [];
}

async function resolveCCPaymentCoinId(
  {
    currencySymbol,
    currencyNetwork,
  }: {
    currencySymbol: string,
    currencyNetwork: string,
  },
): Promise<string | undefined> {
  const cacheKey = `${currencySymbol}:${currencyNetwork}`.toUpperCase();
  const cached = coinIdCache.get(cacheKey);
  if (cached) return cached;

  const listResult = await getCoinList();
  if (!listResult.ok) return undefined;

  const coins = coinListItems(listResult.data);
  const symbol = currencySymbol.toUpperCase();
  const network = currencyNetwork.toUpperCase();
  const match = coins.find((coin) => {
    const coinSymbol = (coin.symbol ?? coin.coinSymbol ?? '').toUpperCase();
    if (coinSymbol !== symbol) return false;

    const chain = (coin.chain ?? '').toUpperCase();

    return !chain || chain === network;
  }) ?? coins.find((coin) => (coin.symbol ?? coin.coinSymbol ?? '').toUpperCase() === symbol);

  const coinId = match?.coinId ?? match?.coin_id;
  if (coinId) coinIdCache.set(cacheKey, coinId);

  return coinId;
}

async function releaseCCPaymentClaim(
  redemptionID: string,
  previousStatus: 'pending' | 'approved',
) {
  const { db } = getGlobalObject();

  await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).updateOne(
    { redemptionID, providerName: 'ccpayment', status: 'processing' },
    { $set: { status: previousStatus, updatedAt: new Date() } },
  );
}

async function failCCPaymentProcessing(
  redemptionID: string,
  meta: RequestedCCPaymentInternalRedemption['meta'],
) {
  const { db } = getGlobalObject();

  await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).updateOne(
    { redemptionID, providerName: 'ccpayment', status: 'processing' },
    {
      $set: {
        status: 'failed',
        updatedAt: new Date(),
        meta,
      },
    },
  );
}

export async function handleCCPaymentRedemptionApproval(
  {
    redemption,
    approvedBy,
  }: {
    redemption: RequestedCCPaymentInternalRedemption,
    approvedBy?: string,
  },
): Promise<FunctionResponse<InternalRedemption, HandleCCPaymentRedemptionApprovalError>> {
  if (redemption.status !== 'pending' && redemption.status !== 'approved') {
    return { ok: false, error: 'invalidRedemptionStatus' };
  }

  const { db } = getGlobalObject();
  const now = new Date();
  const previousStatus = redemption.status;

  const claimed = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).findOneAndUpdate(
    {
      redemptionID: redemption.redemptionID,
      providerName: 'ccpayment',
      status: { $in: [ 'pending', 'approved' ] },
    },
    {
      $set: {
        status: 'processing',
        updatedAt: now,
        approvedBy: approvedBy ?? redemption.approvedBy,
        approvedAt: redemption.approvedAt ?? now,
      },
    },
    { returnDocument: 'after' },
  );

  if (!claimed || claimed.providerName !== 'ccpayment') {
    return { ok: false, error: 'redemptionNotFound' };
  }

  const claimedRedemption = claimed;
  const rewardResult = await getRewardByID(redemption.rewardID);
  const rewardCoinId = rewardResult.ok && rewardResult.data.providerName === 'ccpayment'
    ? rewardResult.data.meta.coinId
    : undefined;
  const coinId = rewardCoinId
    ?? await resolveCCPaymentCoinId({
      currencySymbol: redemption.meta.currencySymbol,
      currencyNetwork: redemption.meta.currencyNetwork,
    });

  if (!coinId) {
    await releaseCCPaymentClaim(redemption.redemptionID, previousStatus);

    return { ok: false, error: 'missingCoinId' };
  }

  const withdrawResult = await withdrawCCP({
    orderId: redemption.redemptionID,
    coinId,
    amount: String(redemption.meta.requestRewardAmount),
    address: redemption.meta.walletAddress,
    chain: redemption.meta.currencyNetwork,
    merchantPayNetworkFee: true,
  });

  if (!withdrawResult.ok) {
    await releaseCCPaymentClaim(redemption.redemptionID, previousStatus);

    return { ok: false, error: 'internalServerError' };
  }

  const recordId = withdrawResult.data.data?.recordId;
  const updated = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).findOneAndUpdate(
    {
      redemptionID: redemption.redemptionID,
      providerName: 'ccpayment',
      status: 'processing',
    },
    {
      $set: {
        updatedAt: new Date(),
        approvedBy: approvedBy ?? claimedRedemption.approvedBy,
        approvedAt: claimedRedemption.approvedAt ?? now,
        meta: {
          ...claimedRedemption.meta,
          recordId,
        },
      },
    },
    { returnDocument: 'after' },
  );

  if (!updated) {
    await failCCPaymentProcessing(redemption.redemptionID, {
      ...claimedRedemption.meta,
      recordId,
      failureReason: 'processingWriteMissed',
    });

    return { ok: false, error: 'redemptionNotFound' };
  }

  return { ok: true, data: updated };
}

type CCPaymentWebhookData = Record<string, string | number | boolean | null>;

function webhookField(data: CCPaymentWebhookData, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (value === undefined || value === null || value.constructor !== String) continue;
    if (value.trim().length > 0) return value.trim();
  }

  return undefined;
}

export function isCCPaymentWebhookSuccess(
  {
    status,
    transactionHash,
  }: {
    status?: string,
    transactionHash?: string,
  },
): boolean {
  if (isFailedWithdrawStatus(status)) return false;

  return isSuccessfulWithdrawStatus(status) || Boolean(transactionHash);
}

function isSuccessfulWithdrawStatus(status: string | undefined): boolean {
  if (!status) return false;

  const normalized = status.toLowerCase();

  return normalized === 'success'
    || normalized === 'successful'
    || normalized === 'completed'
    || normalized === 'complete';
}

function isFailedWithdrawStatus(status: string | undefined): boolean {
  if (!status) return false;

  const normalized = status.toLowerCase();

  return normalized === 'failed'
    || normalized === 'fail'
    || normalized === 'error'
    || normalized === 'rejected';
}

export async function completeCCPaymentRedemptionFromWebhook(
  {
    payload,
  }: {
    payload: { msg_type?: string, data?: unknown },
  },
): Promise<FunctionResponse<AcceptedCCPaymentInternalRedemption | InternalRedemption>> {
  try {
    let data: CCPaymentWebhookData = {};
    if (payload.data instanceof Object && !Array.isArray(payload.data)) {
      // SAFETY: CCPayment webhook data is a JSON object of scalar fields; webhookField only reads known string keys.
      data = payload.data as CCPaymentWebhookData;
    }
    const orderId = webhookField(data, [ 'orderId', 'order_id', 'merchantOrderId' ]);
    const recordId = webhookField(data, [ 'recordId', 'record_id' ]);
    const status = webhookField(data, [ 'status', 'orderStatus' ]);
    const transactionHash = webhookField(data, [ 'txid', 'txId', 'tx_id', 'transactionHash', 'hash' ]);

    if (!orderId && !recordId) {
      return { ok: false, error: 'notFound' };
    }

    const { db } = getGlobalObject();
    const query = orderId
      ? { redemptionID: orderId, providerName: 'ccpayment' as const }
      : { providerName: 'ccpayment' as const, 'meta.recordId': recordId };

    const existing = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).findOne(query);
    if (!existing || existing.providerName !== 'ccpayment') {
      return { ok: false, error: 'notFound' };
    }

    if (existing.status === 'completed') {
      return { ok: true, data: existing };
    }

    if (existing.status !== 'processing' && existing.status !== 'approved') {
      return { ok: false, error: 'invalidRedemptionStatus' };
    }

    const now = new Date();
    const succeeded = isCCPaymentWebhookSuccess({
      status,
      transactionHash,
    });

    if (!succeeded && !isFailedWithdrawStatus(status)) {
      return { ok: true, data: existing };
    }

    if (!succeeded) {
      const failed = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).findOneAndUpdate(
        {
          redemptionID: existing.redemptionID,
          providerName: 'ccpayment',
          status: { $in: [ 'processing', 'approved' ] },
        },
        {
          $set: {
            status: 'failed',
            updatedAt: now,
            meta: {
              ...existing.meta,
              recordId: recordId ?? existing.meta.recordId,
              failureReason: status ?? 'providerFailed',
            },
          },
        },
        { returnDocument: 'after' },
      );

      if (!failed) return { ok: false, error: 'notFound' };

      const refundResult = await refundRedemptionDebit({
        redemptionID: failed.redemptionID,
      });

      if (!refundResult.ok && refundResult.error !== 'alreadyRefunded') {
        console.error('Failed to refund failed CCPayment redemption', refundResult.error);
      }

      return { ok: true, data: failed };
    }

    const completed = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).findOneAndUpdate(
      {
        redemptionID: existing.redemptionID,
        providerName: 'ccpayment',
        status: { $in: [ 'processing', 'approved' ] },
      },
      {
        $set: {
          status: 'completed',
          updatedAt: now,
          meta: {
            ...existing.meta,
            recordId: recordId ?? existing.meta.recordId,
            transactionHash: transactionHash ?? recordId ?? existing.redemptionID,
          },
        },
      },
      { returnDocument: 'after' },
    );

    if (!completed) return { ok: false, error: 'notFound' };

    return { ok: true, data: completed };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export function getRefundAmount(transaction: InternalTransaction): number {
  return Math.abs(transaction.balanceChange);
}

export type RefundRedemptionDebitError =
  | 'alreadyRefunded'
  | 'missingLedgerTransaction'
  | 'internalServerError';

export async function refundRedemptionDebit(
  {
    redemptionID,
  }: {
    redemptionID: string,
  },
): Promise<FunctionResponse<{ sparks: number }, RefundRedemptionDebitError>> {
  const { db, mongoClient, io } = getGlobalObject();
  const now = new Date();

  const claimed = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).findOneAndUpdate(
    {
      redemptionID,
      refundedAt: { $exists: false },
    },
    {
      $set: {
        refundedAt: now,
        updatedAt: now,
      },
    },
    { returnDocument: 'after' },
  );

  if (!claimed) {
    const existing = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).findOne({
      redemptionID,
    });

    return existing?.refundedAt
      ? { ok: false, error: 'alreadyRefunded' }
      : { ok: false, error: 'missingLedgerTransaction' };
  }

  const session = mongoClient.startSession();

  try {
    session.startTransaction();

    if (!claimed.correspondingTransactionID) {
      throw new Error('missingLedgerTransaction');
    }

    const transaction = await db.collection<InternalTransaction>(DatabaseCollections.userTransactions).findOne(
      { transactionID: claimed.correspondingTransactionID },
      { session },
    );

    if (!transaction) throw new Error('missingLedgerTransaction');

    const refundAmount = getRefundAmount(transaction);
    const balanceResult = await updateUserBalance({
      userID: claimed.userID,
      balanceChange: refundAmount,
      inc: {
        'statistics.withdrawn': -refundAmount,
      },
      session,
    });

    if (!balanceResult.ok) throw new Error(balanceResult.error);

    await session.commitTransaction();
    io.to(claimed.userID).emit(SocketEmits.userBalanceChange, balanceResult.data.user.balance.sparks);

    return { ok: true, data: { sparks: refundAmount } };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).updateOne(
      { redemptionID, refundedAt: now },
      { $unset: { refundedAt: '' }, $set: { updatedAt: new Date() } },
    );

    if (error instanceof Error && error.message === 'missingLedgerTransaction') {
      return { ok: false, error: 'missingLedgerTransaction' };
    }

    console.error(error);

    return { ok: false, error: 'internalServerError' };
  } finally {
    await session.endSession();
  }
}

async function releaseRejectedClaim(redemptionID: string) {
  const { db } = getGlobalObject();

  await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).updateOne(
    { redemptionID, status: 'rejected' },
    {
      $set: { status: 'pending', updatedAt: new Date() },
      $unset: { rejectedAt: '', rejectedBy: '', rejectionReason: '', refundedAt: '' },
    },
  );
}

type RejectionUpdate = {
  status: 'rejected',
  rejectedAt: Date,
  rejectedBy: string,
  updatedAt: Date,
  rejectionReason?: string,
};

export async function handleRedemptionRejection(
  {
    redemptionID,
    rejectedBy,
    reason,
  }: {
    redemptionID: string,
    rejectedBy: string,
    reason?: string,
  },
): Promise<FunctionResponse<InternalRedemption, HandleRedemptionRejectionError>> {
  const { db } = getGlobalObject();
  const now = new Date();

  const rejectedUpdate: RejectionUpdate = {
    status: 'rejected',
    rejectedAt: now,
    rejectedBy,
    updatedAt: now,
  };
  if (reason) rejectedUpdate.rejectionReason = reason;

  const claimed = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).findOneAndUpdate(
    {
      redemptionID,
      status: 'pending',
    },
    {
      $set: rejectedUpdate,
    },
    { returnDocument: 'after' },
  );

  if (!claimed) return { ok: false, error: 'redemptionNotFound' };

  const refundResult = await refundRedemptionDebit({ redemptionID });

  if (!refundResult.ok && refundResult.error !== 'alreadyRefunded') {
    await releaseRejectedClaim(redemptionID);

    return { ok: false, error: refundResult.error };
  }

  createUserNotification({
    userID: claimed.userID,
    meta: {
      type: 'redemptionRejected',
      rewardName: claimed.itemName,
      value: claimed.value,
    },
  }).catch(error => {
    console.error(error);
  });

  return { ok: true, data: claimed };
}