import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { createMemoryDb, MemoryCollection } from '../helpers/memoryCollection';
import { baseOffer } from './fixtures';

const offers = new MemoryCollection<Record<string, unknown>>();

mock.module('backend/utils/globalObject', () => ({
  getGlobalObject: () => ({
    db: createMemoryDb({ offers }),
  }),
}));

mock.module('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async () => ({ text: '' }),
    };
  },
}));

const { createOfferID } = await import('backend/utils/offers/ingest');
const { findOfferByOfferID, resolveCatalogOffer } = await import('backend/utils/offers/resolve');

beforeEach(() => {
  offers.reset();
});

describe('resolveCatalogOffer', () => {
  test('uses provider + offerID so waxrewards 72-1 is not lootably Cases.gg', async () => {
    offers.docs.push(baseOffer({
      offerID: '72-1',
      externalID: '72-1',
      provider: 'lootably',
      name: 'Clash',
      displayName: 'Cases.gg',
    }));
    offers.docs.push(baseOffer({
      offerID: '72-1',
      externalID: '72-1',
      provider: 'waxrewards',
      name: 'RAID: Shadow Legends',
      displayName: 'RAID: Shadow Legends',
    }));

    const wax = await resolveCatalogOffer({
      provider: 'waxrewards',
      externalID: '72-1',
    });
    const lootably = await resolveCatalogOffer({
      provider: 'lootably',
      externalID: '72-1',
    });

    expect(wax?.displayName).toBe('RAID: Shadow Legends');
    expect(wax?.provider).toBe('waxrewards');
    expect(lootably?.displayName).toBe('Cases.gg');
    expect(lootably?.provider).toBe('lootably');
  });

  test('resolves post-migration hashed offer IDs with the same provider key', async () => {
    const hashed = createOfferID({ provider: 'waxrewards', externalID: '72-1' });
    offers.docs.push(baseOffer({
      offerID: hashed,
      externalID: '72-1',
      provider: 'waxrewards',
      displayName: 'RAID: Shadow Legends',
    }));

    const match = await resolveCatalogOffer({
      provider: 'waxrewards',
      externalID: '72-1',
    });

    expect(match?.offerID).toBe(hashed);
    expect(match?.displayName).toBe('RAID: Shadow Legends');
  });
});

describe('findOfferByOfferID', () => {
  test('does not pick a provider when the raw offerID collides', async () => {
    offers.docs.push(baseOffer({
      offerID: '72-1',
      provider: 'lootably',
      displayName: 'Cases.gg',
    }));
    offers.docs.push(baseOffer({
      offerID: '72-1',
      provider: 'waxrewards',
      displayName: 'RAID: Shadow Legends',
    }));

    const ambiguous = await findOfferByOfferID({ offerID: '72-1' });
    const wax = await findOfferByOfferID({ offerID: '72-1', provider: 'waxrewards' });

    expect(ambiguous).toBeNull();
    expect(wax?.displayName).toBe('RAID: Shadow Legends');
  });
});
