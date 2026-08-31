import { beforeEach, describe, expect, mock, test } from 'bun:test';
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import { MemoryCollection } from '../helpers/memoryCollection';
import type InternalRedemption from 'types/Redemption/InternalRedemption';
import type InternalUser from 'types/User/InternalUser';

type SendPayload = {
  email: string,
  withdrawalAmount: string,
  withdrawalMethod: string,
  tremendousRedeemUrl?: string,
};

const sendCalls: SendPayload[] = [];
const usersByID = new Map<string, InternalUser>();
const redemptions = new MemoryCollection<Record<string, unknown>>();

mock.module('backend/utils/globalObject', () => ({
  getGlobalObject: () => ({
    db: {
      collection: (name: string) => {
        if (name === DatabaseCollections.userRedemptions) return redemptions;

        return new MemoryCollection<Record<string, unknown>>();
      },
    },
  }),
}));

mock.module('backend/utils/email', () => ({
  sendWithdrawalSent: async (payload: SendPayload) => {
    sendCalls.push(payload);

    return [ false ] as const;
  },
}));

mock.module('backend/utils/user', () => ({
  getRawUser: async ({ userID }: { userID: string }) => {
    const user = usersByID.get(userID);
    if (!user) return { ok: false as const, error: 'notFound' };

    return { ok: true as const, data: user };
  },
}));

const { notifyWithdrawalSent } = await import('backend/utils/redemption');

function userFixture(overrides: Partial<InternalUser> = {}): InternalUser {
  return {
    userID: 'user_1',
    username: 'tester',
    balance: { sparks: 0 },
    emailInformation: { emailAddress: 'user@example.com' },
    phoneInformation: {},
    paymentInformation: { cryptoWallets: [] },
    socialInformation: {},
    notificationPreferences: {
      preferredMethod: 'email',
      securityAlerts: true,
      marketingAlerts: true,
      promotionalAlerts: false,
      newsletterAlerts: false,
    },
    userPreferences: {},
    statistics: {
      earned: { total: 0, bonus: 0 },
      withdrawn: 0,
    },
    referralInformation: {},
    userConfiguration: {},
    personalInformation: {},
    creationDate: new Date(),
    ...overrides,
  } as InternalUser;
}

function cryptoRedemption(overrides: Partial<InternalRedemption> = {}): InternalRedemption {
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
    },
    ...overrides,
  } as InternalRedemption;
}

function giftCardRedemption(overrides: Partial<InternalRedemption> = {}): InternalRedemption {
  const now = new Date();

  return {
    redemptionID: 'red_gift',
    userID: 'user_1',
    rewardID: 'reward_amazon',
    itemName: 'Amazon',
    providerName: 'tremendous',
    value: 2500,
    usdValue: 2.5,
    status: 'completed',
    createdAt: now,
    updatedAt: now,
    meta: {
      requestCurrencyCode: 'USD',
      requestRewardAmount: 2.5,
      requestFeeAmount: 0,
      requestUsdValue: 2.5,
      tremendousCurrency: 'USD',
      tremendousRewardAmount: 2.5,
      tremendousRewardID: 'rw_1',
      tremendousRewardName: 'Amazon',
      tremendousRedemptionID: 'ord_1',
      link: 'https://www.tremendous.com/rewards/redeem/abc',
    },
    ...overrides,
  } as InternalRedemption;
}

async function seedRedemption(redemption: InternalRedemption): Promise<void> {
  await redemptions.insertOne({ ...redemption });
}

describe('notifyWithdrawalSent', () => {
  beforeEach(() => {
    sendCalls.length = 0;
    usersByID.clear();
    redemptions.reset();
  });

  test('sends on crypto accept using the primary email', async () => {
    const redemption = cryptoRedemption();
    usersByID.set('user_1', userFixture());
    await seedRedemption(redemption);

    await notifyWithdrawalSent(redemption);

    expect(sendCalls).toHaveLength(1);
    expect(sendCalls[0]).toEqual({
      email: 'user@example.com',
      withdrawalAmount: '1,000 Sparks',
      withdrawalMethod: 'Litecoin',
    });
  });

  test('includes the Tremendous redeem link on gift-card accept', async () => {
    const redemption = giftCardRedemption();
    usersByID.set('user_1', userFixture());
    await seedRedemption(redemption);

    await notifyWithdrawalSent(redemption);

    expect(sendCalls).toHaveLength(1);
    expect(sendCalls[0]?.email).toBe('user@example.com');
    expect(sendCalls[0]?.tremendousRedeemUrl).toBe(
      'https://www.tremendous.com/rewards/redeem/abc',
    );
    expect(sendCalls[0]?.withdrawalMethod).toBe('Amazon');
  });

  test('falls back to the Google email when the primary address is missing', async () => {
    const redemption = cryptoRedemption();
    usersByID.set('user_1', userFixture({
      emailInformation: {},
      socialInformation: {
        google: { id: 'gid', emailAddress: 'google@example.com' },
      },
    }));
    await seedRedemption(redemption);

    await notifyWithdrawalSent(redemption);

    expect(sendCalls).toHaveLength(1);
    expect(sendCalls[0]?.email).toBe('google@example.com');
  });

  test('skips send when the user has no email', async () => {
    const redemption = cryptoRedemption();
    usersByID.set('user_1', userFixture({
      emailInformation: {},
      socialInformation: {},
    }));
    await seedRedemption(redemption);

    await notifyWithdrawalSent(redemption);

    expect(sendCalls).toHaveLength(0);
  });

  test('skips send when the user is missing', async () => {
    await notifyWithdrawalSent(cryptoRedemption());

    expect(sendCalls).toHaveLength(0);
  });

  test('does not send twice when accept and webhook both notify', async () => {
    const redemption = cryptoRedemption();
    usersByID.set('user_1', userFixture());
    await seedRedemption(redemption);

    await notifyWithdrawalSent(redemption);
    await notifyWithdrawalSent({
      ...redemption,
      status: 'completed',
    });

    expect(sendCalls).toHaveLength(1);
  });
});
