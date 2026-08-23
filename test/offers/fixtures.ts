// Types
import type InternalOffer from 'types/Offer/InternalOffer';
import type { InternalOfferEarning } from 'types/Earnings/InternalEarning';

export function baseOffer(overrides: Partial<InternalOffer> = {}): InternalOffer {
  const now = new Date('2026-01-01T00:00:00.000Z');

  return {
    offerID: 'offer-1',
    externalID: 'ext-1',
    provider: 'lootably',
    status: 'active',
    name: 'Offer Name',
    displayName: 'Offer Display',
    rawDescription: 'Raw description',
    description: 'Offer description',
    image: 'https://example.com/offer.png',
    trackingURL: 'https://track.example.com/?uid={userID}&cid={clickID}',
    paymentModel: [ 'CPA' ],
    offerType: [ 'game' ],
    incentive: true,
    devices: [ 'desktop' ],
    operatingSystem: [ 'windows' ],
    operatingSystemRequirements: [],
    browsers: [],
    browserRequirements: [],
    geos: [ 'US' ],
    geosBlacklist: [],
    geoRequirements: [],
    geoUnrestricted: false,
    multiReward: false,
    reward: [
      {
        rewardID: 'reward-1',
        externalID: 'evt-1',
        description: 'Install',
        value: 1000,
        revenue: 1,
      },
    ],
    totalReward: 1000,
    hash: 'hash-1',
    updatedAt: now,
    createdAt: now,
    ...overrides,
  };
}

export function baseOfferEarning(
  overrides: Partial<InternalOfferEarning> = {},
): InternalOfferEarning {
  const now = new Date('2026-01-01T00:00:00.000Z');

  return {
    type: 'offer',
    userID: 'user_1',
    conversionID: 'conv-1',
    value: 1000,
    usdValue: 1,
    createdAt: now,
    updatedAt: now,
    status: 'completed',
    postbackLogID: 'log-1',
    offerID: 'offer-1',
    provider: 'lootably',
    externalID: 'ext-1',
    offerName: 'Offer Name',
    offerDisplayName: 'Offer Display',
    ...overrides,
  };
}
