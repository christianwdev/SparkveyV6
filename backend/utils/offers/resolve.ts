// Constants
import DatabaseCollections from 'backend/constants/DatabaseCollections';

// Utils
import { getGlobalObject } from 'backend/utils/globalObject';
import { createOfferID } from 'backend/utils/offers/ingest';

// Types
import type { Filter } from 'mongodb';
import type InternalOffer from 'types/Offer/InternalOffer';

function offersCollection() {
  const { db } = getGlobalObject();

  return db.collection<InternalOffer>(DatabaseCollections.offers);
}

function asProvider(provider: string): InternalOffer['provider'] {
  return provider as InternalOffer['provider'];
}

/** Raw postback ID first, then hashed; `{id}-{event}` only as a same-provider fallback. */
export function offerIDCandidates(
  {
    provider,
    externalID,
  }: {
    provider: string,
    externalID: string | number,
  },
): string[] {
  const raw = String(externalID).trim();
  const ids = [
    raw,
    createOfferID({ provider, externalID: raw }),
  ];

  const eventSuffix = raw.match(/^(.+)-(\d+)$/);
  if (eventSuffix) {
    const base = eventSuffix[1];
    ids.push(base, createOfferID({ provider, externalID: base }));
  }

  return [ ...new Set(ids) ];
}

export async function resolveCatalogOffer(
  {
    provider,
    externalID,
  }: {
    provider: string,
    externalID: string | number,
  },
): Promise<InternalOffer | null> {
  const collection = offersCollection();

  for (const offerID of offerIDCandidates({ provider, externalID })) {
    const match = await collection.findOne({
      provider: asProvider(provider),
      offerID,
    });
    if (match) return match;
  }

  return null;
}

export async function findOfferByOfferID(
  {
    offerID,
    provider,
  }: {
    offerID: string,
    provider?: string,
  },
): Promise<InternalOffer | null> {
  const query: Filter<InternalOffer> = { offerID };
  if (provider) {
    query.provider = asProvider(provider);

    return offersCollection().findOne(query);
  }

  const matches = await offersCollection()
    .find(query)
    .limit(2)
    .toArray();

  if (matches.length === 1) return matches[0];

  return null;
}
