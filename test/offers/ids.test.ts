import { describe, expect, mock, test } from 'bun:test';

mock.module('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async () => ({ text: '' }),
    };
  },
}));

const { createOfferID, createOfferHash, createRewardID } = await import('backend/utils/offers/ingest');

describe('offer ID helpers', () => {
  test('createOfferID is stable for the same provider and external ID', () => {
    const first = createOfferID({ provider: 'lootably', externalID: 'abc' });
    const second = createOfferID({ provider: 'lootably', externalID: 'abc' });

    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(0);
  });

  test('createOfferID changes when provider or external ID changes', () => {
    const lootably = createOfferID({ provider: 'lootably', externalID: 'abc' });
    const ayet = createOfferID({ provider: 'ayetstudios', externalID: 'abc' });
    const otherExternal = createOfferID({ provider: 'lootably', externalID: 'xyz' });

    expect(lootably).not.toBe(ayet);
    expect(lootably).not.toBe(otherExternal);
  });

  test('numeric and string external IDs produce the same offer ID', () => {
    expect(createOfferID({ provider: 'lootably', externalID: 42 }))
      .toBe(createOfferID({ provider: 'lootably', externalID: '42' }));
  });

  test('createOfferHash depends on payout total', () => {
    const offerID = createOfferID({ provider: 'lootably', externalID: 'hash-me' });
    const low = createOfferHash({
      offerID,
      reward: {
        rewardID: 'r1',
        externalID: 'e1',
        description: 'A',
        value: 100,
        revenue: 1,
      },
    });
    const high = createOfferHash({
      offerID,
      reward: {
        rewardID: 'r1',
        externalID: 'e1',
        description: 'A',
        value: 200,
        revenue: 1,
      },
    });
    const summed = createOfferHash({
      offerID,
      reward: [
        {
          rewardID: 'r1',
          externalID: 'e1',
          description: 'A',
          value: 50,
          revenue: 1,
        },
        {
          rewardID: 'r2',
          externalID: 'e2',
          description: 'B',
          value: 50,
          revenue: 1,
        },
      ],
    });
    const sameAsLow = createOfferHash({
      offerID,
      reward: [
        {
          rewardID: 'r1',
          externalID: 'e1',
          description: 'A',
          value: 100,
          revenue: 1,
        },
      ],
    });

    expect(low).not.toBe(high);
    expect(low).toBe(sameAsLow);
    expect(summed).toBe(low);
  });

  test('createRewardID is stable and provider-scoped', () => {
    const first = createRewardID({ provider: 'lootably', externalID: 'evt-1' });
    const second = createRewardID({ provider: 'lootably', externalID: 'evt-1' });
    const otherProvider = createRewardID({ provider: 'ayetstudios', externalID: 'evt-1' });

    expect(first).toBe(second);
    expect(first).not.toBe(otherProvider);
  });
});
