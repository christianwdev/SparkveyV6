import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Helpers
import { createMemoryDb, MemoryCollection } from '../helpers/memoryCollection';
import { baseOffer, baseOfferEarning } from './fixtures';

const offers = new MemoryCollection<Record<string, unknown>>();
const earnings = new MemoryCollection<Record<string, unknown>>();

mock.module('backend/utils/globalObject', () => ({
  getGlobalObject: () => ({
    db: createMemoryDb({
      [DatabaseCollections.offers]: offers,
      [DatabaseCollections.userEarnings]: earnings,
    }),
  }),
}));

const { getOfferCompletionSteps } = await import('backend/utils/offers/detail');

beforeEach(() => {
  offers.reset();
  earnings.reset();
});

afterEach(() => {
  offers.reset();
  earnings.reset();
});

describe('getOfferCompletionSteps', () => {
  test('returns an empty list when the offer is missing', async () => {
    const result = await getOfferCompletionSteps({
      userID: 'user_1',
      offerID: 'missing',
    });

    expect(result).toEqual({ ok: true, data: [] });
  });

  test('matches a reward by event external ID', async () => {
    offers.docs.push(baseOffer({
      multiReward: true,
      reward: [
        {
          rewardID: 'reward-install',
          externalID: 'evt-install',
          description: 'Install',
          value: 500,
          revenue: 1,
        },
        {
          rewardID: 'reward-level',
          externalID: 'evt-level',
          description: 'Reach level 10',
          value: 1500,
          revenue: 2,
        },
      ],
    }));
    earnings.docs.push(baseOfferEarning({
      value: 1500,
      event: {
        eventID: 'evt-level',
        eventName: 'Reach level 10',
      },
    }));

    const result = await getOfferCompletionSteps({
      userID: 'user_1',
      offerID: 'offer-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([
      {
        rewardID: 'reward-level',
        value: 1500,
        status: 'completed',
      },
    ]);
  });

  test('falls back to a unique payout value when event metadata is missing', async () => {
    offers.docs.push(baseOffer({
      multiReward: true,
      reward: [
        {
          rewardID: 'reward-install',
          externalID: 'evt-install',
          description: 'Install',
          value: 500,
          revenue: 1,
        },
        {
          rewardID: 'reward-level',
          externalID: 'evt-level',
          description: 'Reach level 10',
          value: 1500,
          revenue: 2,
        },
      ],
    }));
    earnings.docs.push(baseOfferEarning({ value: 500 }));

    const result = await getOfferCompletionSteps({
      userID: 'user_1',
      offerID: 'offer-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([
      {
        rewardID: 'reward-install',
        value: 500,
        status: 'completed',
      },
    ]);
  });

  test('ignores reversed earnings and other users', async () => {
    offers.docs.push(baseOffer());
    earnings.docs.push(baseOfferEarning({
      conversionID: 'conv-reversed',
      status: 'reversed',
    }));
    earnings.docs.push(baseOfferEarning({
      conversionID: 'conv-other',
      userID: 'user_2',
    }));
    earnings.docs.push(baseOfferEarning({
      conversionID: 'conv-ok',
      status: 'held',
      event: {
        eventID: 'evt-1',
        eventName: 'Install',
      },
    }));

    const result = await getOfferCompletionSteps({
      userID: 'user_1',
      offerID: 'offer-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([
      {
        rewardID: 'reward-1',
        value: 1000,
        status: 'held',
      },
    ]);
  });
});
