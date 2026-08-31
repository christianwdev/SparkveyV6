import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import DatabaseCollections from 'backend/constants/DatabaseCollections';
import type { InternalOfferEarning } from 'types/Earnings/InternalEarning';
import type { NormalizedPostback } from 'types/Postback/NormalizedPostback';
import { DEFAULT_INSTANT_EARN_OFFER_LIMIT } from 'types/User/Parts/UserConfiguration';
import { createMemoryDb, MemoryCollection } from '../helpers/memoryCollection';

type BalanceCall = {
  userID: string,
  balanceChange: number,
};

const balanceCalls: BalanceCall[] = [];
const siteStatDeltas: number[] = [];
const earnings = new MemoryCollection<Record<string, unknown>>({
  uniqueFields: [ 'provider', 'conversionID' ],
  yieldBeforeWrite: true,
});
const users = new MemoryCollection<Record<string, unknown>>();

mock.module('backend/utils/globalObject', () => ({
  getGlobalObject: () => ({
    db: createMemoryDb({
      [DatabaseCollections.userEarnings]: earnings,
      [DatabaseCollections.users]: users,
    }),
  }),
}));

mock.module('backend/utils/userBalance', () => ({
  updateUserBalance: async ({ userID, balanceChange }: BalanceCall) => {
    balanceCalls.push({ userID, balanceChange });

    return { ok: true as const, data: undefined };
  },
}));

mock.module('backend/utils/notifications', () => ({
  createUserNotification: async () => ({ ok: true as const, data: undefined }),
}));

mock.module('backend/utils/siteStatistics', () => ({
  adjustTotalEarnedUsd: async (delta: number) => {
    siteStatDeltas.push(delta);

    return 0;
  },
}));

mock.module('backend/utils/liveActivity', () => ({
  emitLiveActivity: () => undefined,
}));

const { handleOfferPostback } = await import('backend/utils/offers/postback');

function basePostback(overrides: Partial<NormalizedPostback> = {}): NormalizedPostback {
  return {
    provider: 'lootably',
    user: 'user_1',
    value: 1000,
    usdValue: 1,
    offerID: 'offer-1',
    offerName: 'Test Offer',
    conversionID: 'conv-shared',
    status: 'completed',
    ...overrides,
  };
}

function seedUser(
  {
    userID = 'user_1',
    instantEarnOfferLimit = DEFAULT_INSTANT_EARN_OFFER_LIMIT,
  }: {
    userID?: string,
    instantEarnOfferLimit?: number,
  } = {},
): void {
  users.docs.push({
    userID,
    userConfiguration: {
      instantEarnOfferLimit,
    },
  });
}

function seedEarning(overrides: Partial<InternalOfferEarning> = {}): InternalOfferEarning {
  const now = new Date();
  const earning: InternalOfferEarning = {
    type: 'offer',
    userID: 'user_1',
    conversionID: 'conv-shared',
    value: 1000,
    usdValue: 1,
    createdAt: now,
    updatedAt: now,
    status: 'completed',
    postbackLogID: 'log-seed',
    offerID: 'lootably-offer-1',
    provider: 'lootably',
    externalID: 'offer-1',
    offerName: 'Test Offer',
    offerDisplayName: 'Test Offer',
    ...overrides,
  };

  earnings.docs.push({ ...earning });

  return earning;
}

beforeEach(() => {
  earnings.reset();
  users.reset();
  balanceCalls.length = 0;
  siteStatDeltas.length = 0;
});

afterEach(() => {
  earnings.reset();
  users.reset();
  balanceCalls.length = 0;
  siteStatDeltas.length = 0;
});

describe('handleOfferPostback — new conversions', () => {
  test('creates a held earning without crediting balance (hold queue)', async () => {
    const result = await handleOfferPostback({
      postbackInformation: basePostback(),
      requestID: 'req-1',
    });

    expect(result.ok).toBe(true);
    expect(earnings.docs).toHaveLength(1);
    expect(earnings.docs[0].status).toBe('held');
    expect(balanceCalls).toEqual([]);
    expect(siteStatDeltas).toEqual([ 1 ]);
  });

  test('rejects a brand-new reversed postback without inserting or crediting', async () => {
    const result = await handleOfferPostback({
      postbackInformation: basePostback({ status: 'reversed' }),
      requestID: 'req-rev-new',
    });

    expect(result).toEqual({ ok: false, error: 'invalidStatus' });
    expect(earnings.docs).toHaveLength(0);
    expect(balanceCalls).toEqual([]);
  });

  test('second postback for the same conversionID is alreadyHandled (no double insert)', async () => {
    const first = await handleOfferPostback({
      postbackInformation: basePostback(),
      requestID: 'req-1',
    });
    const second = await handleOfferPostback({
      postbackInformation: basePostback(),
      requestID: 'req-2',
    });

    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, error: 'alreadyHandled' });
    expect(earnings.docs).toHaveLength(1);
    expect(balanceCalls).toEqual([]);
    expect(siteStatDeltas).toEqual([ 1 ]);
  });

  test('concurrent identical postbacks do not create two earnings or double site stats', async () => {
    const postback = basePostback({ conversionID: 'conv-race' });

    const [ a, b ] = await Promise.all([
      handleOfferPostback({ postbackInformation: postback, requestID: 'req-a' }),
      handleOfferPostback({ postbackInformation: postback, requestID: 'req-b' }),
    ]);

    const successes = [ a, b ].filter(result => result.ok);
    const duplicates = [ a, b ].filter(result => !result.ok && result.error === 'alreadyHandled');

    expect(successes).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
    expect(earnings.docs).toHaveLength(1);
    expect(siteStatDeltas).toEqual([ 1 ]);
    expect(balanceCalls).toEqual([]);
  });

  test('same conversionID from different providers is allowed', async () => {
    const first = await handleOfferPostback({
      postbackInformation: basePostback({ provider: 'lootably', conversionID: 'shared-id' }),
      requestID: 'req-lootably',
    });
    const second = await handleOfferPostback({
      postbackInformation: basePostback({ provider: 'ayetstudios', conversionID: 'shared-id' }),
      requestID: 'req-ayet',
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(earnings.docs).toHaveLength(2);
    expect(siteStatDeltas).toEqual([ 1, 1 ]);
  });
});

describe('handleOfferPostback — reversals', () => {
  test('reversing a held earning does not debit balance', async () => {
    seedEarning({ status: 'held', heldUntil: new Date(Date.now() + 86_400_000) });

    const result = await handleOfferPostback({
      postbackInformation: basePostback({ status: 'reversed' }),
      requestID: 'req-rev-held',
    });

    expect(result.ok).toBe(true);
    expect(earnings.docs[0].status).toBe('reversed');
    expect(balanceCalls).toEqual([]);
    expect(siteStatDeltas).toEqual([ -1 ]);
  });

  test('reversing a completed earning debits balance once', async () => {
    seedEarning({ status: 'completed' });

    const result = await handleOfferPostback({
      postbackInformation: basePostback({ status: 'reversed' }),
      requestID: 'req-rev-completed',
    });

    expect(result.ok).toBe(true);
    expect(earnings.docs[0].status).toBe('reversed');
    expect(balanceCalls).toEqual([ { userID: 'user_1', balanceChange: -1000 } ]);
    expect(siteStatDeltas).toEqual([ -1 ]);
  });

  test('reversing an already-reversed earning is alreadyHandled with no debit', async () => {
    seedEarning({ status: 'reversed', reversedAt: new Date() });

    const result = await handleOfferPostback({
      postbackInformation: basePostback({ status: 'reversed' }),
      requestID: 'req-rev-again',
    });

    expect(result).toEqual({ ok: false, error: 'alreadyHandled' });
    expect(balanceCalls).toEqual([]);
    expect(siteStatDeltas).toEqual([]);
  });

  test('concurrent reversals of a completed earning debit balance only once', async () => {
    seedEarning({ status: 'completed', conversionID: 'conv-rev-race' });

    const postback = basePostback({ conversionID: 'conv-rev-race', status: 'reversed' });

    const [ a, b ] = await Promise.all([
      handleOfferPostback({ postbackInformation: postback, requestID: 'req-rev-a' }),
      handleOfferPostback({ postbackInformation: postback, requestID: 'req-rev-b' }),
    ]);

    const successes = [ a, b ].filter(result => result.ok);
    const handled = [ a, b ].filter(result => !result.ok && (
      result.error === 'alreadyHandled' || result.error === 'internalError'
    ));

    expect(successes).toHaveLength(1);
    expect(handled).toHaveLength(1);
    expect(earnings.docs[0].status).toBe('reversed');
    expect(balanceCalls).toEqual([ { userID: 'user_1', balanceChange: -1000 } ]);
    expect(siteStatDeltas).toEqual([ -1 ]);
  });

  test('providerPending confirmation moves to held without crediting', async () => {
    seedEarning({ status: 'providerPending' });

    const result = await handleOfferPostback({
      postbackInformation: basePostback({ status: 'completed' }),
      requestID: 'req-confirm',
    });

    expect(result.ok).toBe(true);
    expect(earnings.docs[0].status).toBe('held');
    expect(balanceCalls).toEqual([]);
  });

  test('providerPending confirmation credits immediately when under the user instant limit', async () => {
    seedUser();
    seedEarning({ status: 'providerPending' });

    const result = await handleOfferPostback({
      postbackInformation: basePostback({ status: 'completed' }),
      requestID: 'req-confirm-instant',
    });

    expect(result.ok).toBe(true);
    expect(earnings.docs[0].status).toBe('completed');
    expect(earnings.docs[0].heldUntil).toBeUndefined();
    expect(balanceCalls).toEqual([ { userID: 'user_1', balanceChange: 1000 } ]);
  });
});

describe('handleOfferPostback — instant earn limit', () => {
  test('credits a default user immediately for an offer at or under 3k', async () => {
    seedUser();

    const result = await handleOfferPostback({
      postbackInformation: basePostback({ value: DEFAULT_INSTANT_EARN_OFFER_LIMIT }),
      requestID: 'req-instant-default',
    });

    expect(result.ok).toBe(true);
    expect(earnings.docs[0].status).toBe('completed');
    expect(earnings.docs[0].heldUntil).toBeUndefined();
    expect(balanceCalls).toEqual([
      { userID: 'user_1', balanceChange: DEFAULT_INSTANT_EARN_OFFER_LIMIT },
    ]);
  });

  test('holds an offer above the user instant earn limit', async () => {
    seedUser();

    const result = await handleOfferPostback({
      postbackInformation: basePostback({ value: DEFAULT_INSTANT_EARN_OFFER_LIMIT + 1 }),
      requestID: 'req-held-over-limit',
    });

    expect(result.ok).toBe(true);
    expect(earnings.docs[0].status).toBe('held');
    expect(earnings.docs[0].heldUntil).toBeInstanceOf(Date);
    expect(balanceCalls).toEqual([]);
  });

  test('treats a stored instant limit of 0 as the 3k product default', async () => {
    seedUser({ instantEarnOfferLimit: 0 });

    const result = await handleOfferPostback({
      postbackInformation: basePostback({ value: 2_500 }),
      requestID: 'req-zero-means-default',
    });

    expect(result.ok).toBe(true);
    expect(earnings.docs[0].status).toBe('completed');
    expect(balanceCalls).toEqual([ { userID: 'user_1', balanceChange: 2_500 } ]);
  });

  test('honors a raised instant earn limit', async () => {
    seedUser({ instantEarnOfferLimit: 5_000 });

    const result = await handleOfferPostback({
      postbackInformation: basePostback({ value: 4_999 }),
      requestID: 'req-raised-limit',
    });

    expect(result.ok).toBe(true);
    expect(earnings.docs[0].status).toBe('completed');
    expect(balanceCalls).toEqual([ { userID: 'user_1', balanceChange: 4_999 } ]);
  });
});
