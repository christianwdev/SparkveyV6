import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { MemoryCollection } from '../helpers/memoryCollection';
import type InternalRedemption from 'types/Redemption/InternalRedemption';

const LTC_TX = 'b55bb28292de56432b06204f71c68847a71670f2fc311af5c53a6ded45ab047b';

const redemptions = new MemoryCollection<Record<string, unknown>>();
const withdrawRecords = new Map<string, { status?: string, txId?: string, recordId?: string }>();

mock.module('backend/utils/globalObject', () => ({
  getGlobalObject: () => ({
    db: {
      collection: () => redemptions,
    },
  }),
}));

mock.module('backend/utils/ccpayment', () => ({
  getAppWithdrawRecord: async (
    {
      recordId,
      orderId,
    }: {
      recordId?: string,
      orderId?: string,
    },
  ) => {
    const record = (orderId && withdrawRecords.get(orderId))
      || (recordId && withdrawRecords.get(recordId));

    if (!record) return { ok: false as const, error: 'internalServerError' };

    return { ok: true as const, data: { record } };
  },
  checkCCPAddressValidity: async () => ({ ok: true as const, data: { addrIsValid: true } }),
  getCoinList: async () => ({ ok: true as const, data: [] }),
  withdrawCCP: async () => ({ ok: false as const, error: 'internalServerError' }),
}));

const { completeCCPaymentRedemptionFromWebhook } = await import('backend/utils/redemption');

function processingRedemption(overrides: Partial<InternalRedemption> = {}): InternalRedemption {
  const now = new Date();

  return {
    redemptionID: 'red_crypto',
    userID: 'user_1',
    rewardID: 'reward_ltc',
    itemName: 'Litecoin',
    providerName: 'ccpayment',
    value: 1000,
    usdValue: 1,
    status: 'processing',
    createdAt: now,
    updatedAt: now,
    meta: {
      walletAddress: 'ltc1qtest',
      currencySymbol: 'LTC',
      currencyNetwork: 'LTC',
      currencyRate: 1,
      requestRewardAmount: 1,
      requestFeeAmount: 0,
      recordId: 'rec_1',
    },
    ...overrides,
  } as InternalRedemption;
}

describe('CCPayment withdrawal hash', () => {
  beforeEach(() => {
    redemptions.reset();
    withdrawRecords.clear();
  });

  test('Processing webhook stores the on-chain hash without completing', async () => {
    redemptions.docs.push(processingRedemption() as Record<string, unknown>);
    withdrawRecords.set('red_crypto', {
      status: 'Processing',
      txId: LTC_TX,
      recordId: 'rec_1',
    });

    const result = await completeCCPaymentRedemptionFromWebhook({
      payload: {
        type: 'ApiWithdrawal',
        msg: {
          orderId: 'red_crypto',
          recordId: 'rec_1',
          status: 'Processing',
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.status).toBe('processing');
    expect(
      result.data.providerName === 'ccpayment' ? result.data.meta.transactionHash : undefined,
    ).toBe(LTC_TX);
  });

  test('a hash alone does not mark the redemption completed', async () => {
    redemptions.docs.push(processingRedemption() as Record<string, unknown>);
    withdrawRecords.set('red_crypto', {
      status: 'Processing',
      txId: LTC_TX,
      recordId: 'rec_1',
    });

    const result = await completeCCPaymentRedemptionFromWebhook({
      payload: {
        type: 'ApiWithdrawal',
        msg: {
          orderId: 'red_crypto',
          recordId: 'rec_1',
          status: 'Processing',
          txId: LTC_TX,
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe('processing');
  });

  test('Success webhook still completes and keeps the hash', async () => {
    redemptions.docs.push(processingRedemption({
      meta: {
        walletAddress: 'ltc1qtest',
        currencySymbol: 'LTC',
        currencyNetwork: 'LTC',
        currencyRate: 1,
        requestRewardAmount: 1,
        requestFeeAmount: 0,
        recordId: 'rec_1',
        transactionHash: LTC_TX,
      },
    }) as Record<string, unknown>);
    withdrawRecords.set('red_crypto', {
      status: 'Success',
      txId: LTC_TX,
      recordId: 'rec_1',
    });

    const result = await completeCCPaymentRedemptionFromWebhook({
      payload: {
        type: 'ApiWithdrawal',
        msg: {
          orderId: 'red_crypto',
          recordId: 'rec_1',
          status: 'Success',
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe('completed');
    expect(
      result.data.providerName === 'ccpayment' ? result.data.meta.transactionHash : undefined,
    ).toBe(LTC_TX);
  });
});
