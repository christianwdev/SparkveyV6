import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Helpers
import { createMemoryDb, MemoryCollection } from '../helpers/memoryCollection';
import { baseOffer } from './fixtures';

const offers = new MemoryCollection<Record<string, unknown>>();

mock.module('backend/utils/globalObject', () => ({
  getGlobalObject: () => ({
    db: createMemoryDb({
      [DatabaseCollections.offers]: offers,
    }),
  }),
}));

const { getInternalOfferByID, getSanitizedOfferByID } = await import('backend/utils/offers/detail');

beforeEach(() => {
  offers.reset();
});

afterEach(() => {
  offers.reset();
});

describe('offer availability', () => {
  test('returns notFound when the offer does not exist', async () => {
    const result = await getSanitizedOfferByID({
      offerID: 'missing',
      country: 'US',
    });

    expect(result).toEqual({ ok: false, error: 'notFound' });
  });

  test('returns unavailable when the offer is inactive', async () => {
    offers.docs.push(baseOffer({ status: 'inactive' }));

    const result = await getSanitizedOfferByID({
      offerID: 'offer-1',
      country: 'US',
    });

    expect(result).toEqual({ ok: false, error: 'unavailable' });
  });

  test('returns unavailable when the country is blacklisted', async () => {
    offers.docs.push(baseOffer({
      geoUnrestricted: true,
      geosBlacklist: [ 'US' ],
    }));

    const result = await getSanitizedOfferByID({
      offerID: 'offer-1',
      country: 'US',
    });

    expect(result).toEqual({ ok: false, error: 'unavailable' });
  });

  test('returns unavailable when the country is outside the allow-list', async () => {
    offers.docs.push(baseOffer({
      geoUnrestricted: false,
      geos: [ 'DE' ],
    }));

    const result = await getSanitizedOfferByID({
      offerID: 'offer-1',
      country: 'US',
    });

    expect(result).toEqual({ ok: false, error: 'unavailable' });
  });

  test('returns the sanitized offer when geo-unrestricted', async () => {
    offers.docs.push(baseOffer({
      geoUnrestricted: true,
      geos: [],
    }));

    const result = await getSanitizedOfferByID({
      offerID: 'offer-1',
      country: 'BR',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.offerID).toBe('offer-1');
    expect(result.data).not.toHaveProperty('trackingURL');
  });

  test('returns the internal offer when the country is allow-listed', async () => {
    const offer = baseOffer({
      geoUnrestricted: false,
      geos: [ 'CA' ],
    });
    offers.docs.push(offer);

    const result = await getInternalOfferByID({
      offerID: 'offer-1',
      country: 'CA',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.trackingURL).toBe(offer.trackingURL);
  });
});
