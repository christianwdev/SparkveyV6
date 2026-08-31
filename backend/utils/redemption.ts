import { createId } from '@paralleldrive/cuid2';

// Constants
import DatabaseCollections from '../constants/DatabaseCollections';
import SocketEmits from '../constants/SocketEmits';

// Utils
import { checkCCPAddressValidity, getAppWithdrawRecord, getCoinList, withdrawCCP } from './ccpayment';
import { convertUSDToCurrency, getCurrencyRates } from './currency';
import { sendWithdrawalSent } from './email';
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
  | 'currencyRateUnavailable'
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
      if (
        typeof currencyCode === 'string'
        && currencyCode.length > 0
        && currencyCode.toUpperCase() !== primaryCurrencyCode.toUpperCase()
      ) {
        return { ok: false, error: 'invalidCurrencyCode' };
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

    notifyWithdrawalSent(redemptionUpdateResult).catch(error => {
      console.error(error);
    });

    return { ok: true, data: redemptionUpdateResult as AcceptedTremendousInternalRedemption };
  } catch (error) {
    console.error(error);

    await failTremendousProcessing(redemption.redemptionID, {
      ...acceptedRedemption.meta,
      failureReason: 'completionWriteError',
    });

    return { ok: false, error: 'internalServerError' };
  }
}

type CCPaymentCoinListItem = {
  coinId?: string,
  coin_id?: string,
  symbol?: string,
  coinSymbol?: string,
  chain?: string,
};

const coinIdCache = new Map<string, string>();

function coinListItems(payload: unknown): CCPaymentCoinListItem[] {
  if (Array.isArray(payload)) return payload as CCPaymentCoinListItem[];
  if (payload && typeof payload === 'object' && 'coins' in payload) {
    const coins = (payload as { coins?: unknown }).coins;
    if (Array.isArray(coins)) return coins as CCPaymentCoinListItem[];
  }

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

  const claimedRedemption = claimed as RequestedCCPaymentInternalRedemption;
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

  const rates = await getCurrencyRates();
  const coinAmount = rates
    ? convertUSDToCurrency({
      amount: claimedRedemption.usdValue,
      currencyCode: claimedRedemption.meta.currencySymbol,
      rates,
    })
    : null;

  if (coinAmount === null || coinAmount <= 0 || claimedRedemption.usdValue <= 0) {
    await releaseCCPaymentClaim(claimedRedemption.redemptionID, previousStatus);

    return { ok: false, error: 'currencyRateUnavailable' };
  }

  const currencyRate = coinAmount / claimedRedemption.usdValue;
  const withdrawResult = await withdrawCCP({
    orderId: claimedRedemption.redemptionID,
    coinId,
    amount: formatCryptoWithdrawAmount(coinAmount),
    address: claimedRedemption.meta.walletAddress,
    chain: claimedRedemption.meta.currencyNetwork,
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
          currencyRate,
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

  notifyWithdrawalSent(updated).catch(error => {
    console.error(error);
  });

  return { ok: true, data: updated };
}

function webhookRecord(payload: { data?: unknown, msg?: unknown }): Record<string, unknown> {
  if (payload.msg && typeof payload.msg === 'object' && !Array.isArray(payload.msg)) {
    return payload.msg as Record<string, unknown>;
  }

  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data as Record<string, unknown>;
  }

  return {};
}

function webhookField(data: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }

  return undefined;
}

export function isCCPaymentWebhookSuccess(
  {
    status,
  }: {
    status?: string,
  },
): boolean {
  return isSuccessfulWithdrawStatus(status);
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

function isOnChainTxId(value: string | undefined): boolean {
  if (!value) return false;

  const hex = value.replace(/^0x/i, '');
  if (/^[a-fA-F0-9]{64}$/.test(hex)) return true;

  return /^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(value);
}

function withdrawRecordObject(payload: unknown): Record<string, unknown> | undefined {
  if (!payload || typeof payload !== 'object') return undefined;

  const root = payload as Record<string, unknown>;
  const record = root.record && typeof root.record === 'object' && !Array.isArray(root.record)
    ? root.record as Record<string, unknown>
    : root;

  return record;
}

function withdrawRecordTxId(payload: unknown): string | undefined {
  const record = withdrawRecordObject(payload);

  return record ? webhookField(record, [ 'txId', 'txid', 'tx_id', 'transactionHash' ]) : undefined;
}

function withdrawRecordStatus(payload: unknown): string | undefined {
  const record = withdrawRecordObject(payload);

  return record ? webhookField(record, [ 'status', 'orderStatus' ]) : undefined;
}

function withdrawRecordId(payload: unknown): string | undefined {
  const record = withdrawRecordObject(payload);

  return record ? webhookField(record, [ 'recordId', 'record_id' ]) : undefined;
}

function redemptionMetaTxHash(redemption: InternalRedemption): string | undefined {
  if (!redemption.meta || typeof redemption.meta !== 'object') return undefined;

  const hash = (redemption.meta as { transactionHash?: unknown }).transactionHash;

  return typeof hash === 'string' ? hash : undefined;
}

type ResolvedWithdrawSnapshot = {
  status?: string,
  txId?: string,
  recordId?: string,
};

async function resolveWithdrawSnapshot(
  {
    recordId,
    orderId,
    webhookTxId,
    webhookStatus,
  }: {
    recordId?: string,
    orderId?: string,
    webhookTxId?: string,
    webhookStatus?: string,
  },
): Promise<ResolvedWithdrawSnapshot> {
  const snapshot: ResolvedWithdrawSnapshot = {
    status: webhookStatus,
    recordId,
  };
  if (isOnChainTxId(webhookTxId)) snapshot.txId = webhookTxId;

  if (!recordId && !orderId) return snapshot;

  const recordResult = await getAppWithdrawRecord({
    recordId,
    orderId,
  });

  if (!recordResult.ok) return snapshot;

  const recordStatus = withdrawRecordStatus(recordResult.data);
  const recordTxId = withdrawRecordTxId(recordResult.data);
  const nextRecordId = withdrawRecordId(recordResult.data);

  if (recordStatus) snapshot.status = recordStatus;
  if (isOnChainTxId(recordTxId)) snapshot.txId = recordTxId;
  if (nextRecordId) snapshot.recordId = nextRecordId;

  return snapshot;
}

async function persistCCPaymentTxId(
  {
    redemptionID,
    recordId,
    transactionHash,
    statuses,
  }: {
    redemptionID: string,
    recordId?: string,
    transactionHash: string,
    statuses: Array<'processing' | 'approved' | 'completed'>,
  },
): Promise<InternalRedemption | null> {
  const { db } = getGlobalObject();
  const set: {
    updatedAt: Date,
    'meta.transactionHash': string,
    'meta.recordId'?: string,
  } = {
    updatedAt: new Date(),
    'meta.transactionHash': transactionHash,
  };
  if (recordId) set['meta.recordId'] = recordId;

  return db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).findOneAndUpdate(
    {
      redemptionID,
      providerName: 'ccpayment',
      status: { $in: statuses },
    },
    { $set: set },
    { returnDocument: 'after' },
  );
}

async function applyCCPaymentProviderUpdate(
  {
    existing,
    webhookStatus,
    webhookTxId,
    webhookRecordId,
  }: {
    existing: InternalRedemption,
    webhookStatus?: string,
    webhookTxId?: string,
    webhookRecordId?: string,
  },
): Promise<FunctionResponse<InternalRedemption>> {
  if (existing.providerName !== 'ccpayment') {
    return { ok: false, error: 'notFound' };
  }

  if (existing.status !== 'processing' && existing.status !== 'approved') {
    return { ok: false, error: 'invalidRedemptionStatus' };
  }

  const snapshot = await resolveWithdrawSnapshot({
    recordId: webhookRecordId ?? existing.meta.recordId,
    orderId: existing.redemptionID,
    webhookTxId,
    webhookStatus,
  });

  const now = new Date();
  const { db } = getGlobalObject();
  const succeeded = isCCPaymentWebhookSuccess({
    status: snapshot.status,
  });

  // Hash is available at broadcast; Success still waits for confirmations.
  if (!succeeded && !isFailedWithdrawStatus(snapshot.status)) {
    const currentHash = redemptionMetaTxHash(existing);
    if (isOnChainTxId(currentHash) || !snapshot.txId) {
      return { ok: true, data: existing };
    }

    const updated = await persistCCPaymentTxId({
      redemptionID: existing.redemptionID,
      recordId: snapshot.recordId ?? existing.meta.recordId,
      transactionHash: snapshot.txId,
      statuses: [ 'processing', 'approved' ],
    });

    return { ok: true, data: updated ?? existing };
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
            recordId: snapshot.recordId ?? existing.meta.recordId,
            failureReason: snapshot.status ?? 'providerFailed',
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

  const completedSet: {
    status: 'completed',
    updatedAt: Date,
    'meta.recordId'?: string,
    'meta.transactionHash'?: string,
  } = {
    status: 'completed',
    updatedAt: now,
  };

  const nextRecordId = snapshot.recordId ?? existing.meta.recordId;
  if (nextRecordId) completedSet['meta.recordId'] = nextRecordId;
  if (snapshot.txId) completedSet['meta.transactionHash'] = snapshot.txId;

  const completed = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).findOneAndUpdate(
    {
      redemptionID: existing.redemptionID,
      providerName: 'ccpayment',
      status: { $in: [ 'processing', 'approved' ] },
    },
    { $set: completedSet },
    { returnDocument: 'after' },
  );

  if (!completed) return { ok: false, error: 'notFound' };

  return { ok: true, data: completed as AcceptedCCPaymentInternalRedemption };
}

export async function completeCCPaymentRedemptionFromWebhook(
  {
    payload,
  }: {
    payload: { msg_type?: string, type?: string, data?: unknown, msg?: unknown },
  },
): Promise<FunctionResponse<AcceptedCCPaymentInternalRedemption | InternalRedemption>> {
  try {
    const data = webhookRecord(payload);
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
      const currentHash = redemptionMetaTxHash(existing);
      if (isOnChainTxId(currentHash)) {
        return { ok: true, data: existing as AcceptedCCPaymentInternalRedemption };
      }

      const snapshot = await resolveWithdrawSnapshot({
        recordId: recordId ?? existing.meta.recordId,
        orderId: existing.redemptionID,
        webhookTxId: transactionHash,
        webhookStatus: status,
      });

      if (!snapshot.txId) {
        return { ok: true, data: existing as AcceptedCCPaymentInternalRedemption };
      }

      const backfilled = await persistCCPaymentTxId({
        redemptionID: existing.redemptionID,
        recordId: snapshot.recordId ?? existing.meta.recordId,
        transactionHash: snapshot.txId,
        statuses: [ 'completed' ],
      });

      return {
        ok: true,
        data: (backfilled ?? existing) as AcceptedCCPaymentInternalRedemption,
      };
    }

    return applyCCPaymentProviderUpdate({
      existing,
      webhookStatus: status,
      webhookTxId: transactionHash,
      webhookRecordId: recordId,
    });
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

  const rejectedUpdate: {
    status: 'rejected',
    rejectedAt: Date,
    rejectedBy: string,
    updatedAt: Date,
    rejectionReason?: string,
  } = {
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

export async function notifyWithdrawalSent(redemption: InternalRedemption): Promise<void> {
  const userResult = await getRawUser({ userID: redemption.userID });
  if (!userResult.ok) {
    console.error(`Failed to load user for withdrawal-sent email ${redemption.redemptionID}: ${userResult.error}`);

    return;
  }

  const email = resolveUserEmail(userResult.data);
  if (!email) {
    console.error(`Skipping withdrawal-sent email for ${redemption.redemptionID}: user has no email`);

    return;
  }

  const { db } = getGlobalObject();
  const claimed = await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).findOneAndUpdate(
    {
      redemptionID: redemption.redemptionID,
      withdrawalEmailSentAt: { $exists: false },
    },
    {
      $set: { withdrawalEmailSentAt: new Date() },
    },
    { returnDocument: 'after' },
  );

  if (!claimed) return;

  const payload: {
    email: string,
    withdrawalAmount: string,
    withdrawalMethod: string,
    tremendousRedeemUrl?: string,
  } = {
    email,
    withdrawalAmount: `${claimed.value.toLocaleString('en-US')} Sparks`,
    withdrawalMethod: claimed.itemName,
  };

  if (
    claimed.providerName === 'tremendous'
    && claimed.status === 'completed'
    && claimed.meta
    && typeof claimed.meta === 'object'
    && 'link' in claimed.meta
    && typeof claimed.meta.link === 'string'
    && claimed.meta.link.startsWith('https://')
  ) {
    payload.tremendousRedeemUrl = claimed.meta.link;
  }

  const [ emailError ] = await sendWithdrawalSent(payload);
  if (emailError) {
    await db.collection<InternalRedemption>(DatabaseCollections.userRedemptions).updateOne(
      { redemptionID: redemption.redemptionID },
      { $unset: { withdrawalEmailSentAt: '' } },
    );
    console.error(`Failed to send withdrawal-sent email for ${redemption.redemptionID}`);
  }
}

function resolveUserEmail(user: InternalUser): string | undefined {
  const primary = user.emailInformation?.emailAddress?.trim();
  if (primary) return primary;

  const google = user.socialInformation?.google?.emailAddress?.trim();
  if (google) return google;

  return undefined;
}

const CRYPTO_WITHDRAW_DECIMALS = 8;

function formatCryptoWithdrawAmount(amount: number): string {
  return amount.toFixed(CRYPTO_WITHDRAW_DECIMALS).replace(/\.?0+$/, '');
}