import { describe, expect, test } from 'bun:test';

// Utils
import { sanitizeOffer, sanitizeOffers } from 'backend/utils/offers/sanitize';

// Helpers
import { baseOffer } from './fixtures';

describe('sanitizeOffer', () => {
  test('strips tracking, geo, and custom-admin fields from the client payload', () => {
    const offer = baseOffer({
      trackingURL: 'https://secret.example.com/{userID}',
      hash: 'internal-hash',
      rawDescription: 'provider dump',
    });
    const sanitized = sanitizeOffer(offer);

    expect(sanitized.offerID).toBe(offer.offerID);
    expect(sanitized.provider).toBe('lootably');
    expect(sanitized.name).toBe('Offer Display');
    expect(sanitized.description).toBe('Offer description');
    expect(sanitized.totalReward).toBe(1000);
    expect(sanitized.reward).toEqual([
      {
        rewardID: 'reward-1',
        description: 'Install',
        value: 1000,
      },
    ]);
    expect(sanitized).not.toHaveProperty('trackingURL');
    expect(sanitized).not.toHaveProperty('hash');
    expect(sanitized).not.toHaveProperty('rawDescription');
    expect(sanitized).not.toHaveProperty('geos');
    expect(sanitized).not.toHaveProperty('customInformation');
  });

  test('prefers custom display name, description, terms, and disclaimer', () => {
    const sanitized = sanitizeOffer(baseOffer({
      terms: 'Provider terms',
      disclaimer: 'Provider disclaimer',
      customInformation: {
        displayName: 'Staff Title',
        description: 'Staff copy',
        terms: 'Staff terms',
        disclaimer: 'Staff disclaimer',
      },
    }));

    expect(sanitized.name).toBe('Staff Title');
    expect(sanitized.description).toBe('Staff copy');
    expect(sanitized.terms).toBe('Staff terms');
    expect(sanitized.disclaimer).toBe('Staff disclaimer');
  });

  test('applies custom reward overrides without leaking revenue', () => {
    const sanitized = sanitizeOffer(baseOffer({
      reward: [
        {
          rewardID: 'reward-1',
          externalID: 'evt-1',
          description: 'Install',
          value: 1000,
          revenue: 4.5,
        },
      ],
      customRewards: [
        {
          rewardID: 'reward-1',
          description: 'Complete the install',
          value: 1500,
        },
      ],
    }));

    expect(sanitized.reward).toEqual([
      {
        rewardID: 'reward-1',
        description: 'Complete the install',
        value: 1500,
      },
    ]);
    expect(sanitized.reward[0]).not.toHaveProperty('revenue');
    expect(sanitized.reward[0]).not.toHaveProperty('externalID');
  });

  test('omits terms and disclaimer when neither source provides them', () => {
    const sanitized = sanitizeOffer(baseOffer());

    expect(sanitized).not.toHaveProperty('terms');
    expect(sanitized).not.toHaveProperty('disclaimer');
    expect(sanitized).not.toHaveProperty('additionalInformation');
  });

  test('sanitizeOffers maps every item', () => {
    const sanitized = sanitizeOffers([
      baseOffer({ offerID: 'a' }),
      baseOffer({ offerID: 'b', displayName: 'Second' }),
    ]);

    expect(sanitized.map(offer => offer.offerID)).toEqual([ 'a', 'b' ]);
    expect(sanitized[1].name).toBe('Second');
  });
});
