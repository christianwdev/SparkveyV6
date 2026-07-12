import uuidv5 from 'uuidv5';
import { GoogleGenAI } from '@google/genai';

import DatabaseCollections from '../../constants/DatabaseCollections';
import { getGlobalObject } from '../globalObject';

import type { AnyBulkWriteOperation, UpdateFilter } from 'mongodb';
import type InternalOffer from 'types/Offer/InternalOffer';
import type { IngestedOffer } from 'types/Offer/InternalOffer';
import type OfferHistory from 'types/Offer/History/OfferHistory';
import type OfferReward from 'types/Offer/OfferReward';
import type OfferType from 'types/Offer/OfferType';
import { OfferTypeSet } from 'types/Offer/OfferType';

const BATCH_SIZE = 100;
const CATEGORY_BATCH_SIZE = 15;
const PRELOAD_CHUNK_SIZE = 500;

const offerNamespace = uuidv5('null', 'sparkvey-offer-namespace', true);

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── ID / Hash helpers ────────────────────────────────────────────────────────

export function createOfferID({
  provider,
  externalID,
}: {
  provider: string,
  externalID: string | number,
}): string {
  return uuidv5(offerNamespace, `${provider}-${externalID}`);
}

export function createOfferHash({
  offerID,
  reward,
}: {
  offerID: string,
  reward: OfferReward | OfferReward[],
}): string {
  let totalPayout = 0;

  if (Array.isArray(reward)) {
    totalPayout = reward.reduce((pv, cv) => pv + +cv.value, 0);
  } else {
    totalPayout = reward.value === 'variable' ? 0 : reward.value;
  }

  return uuidv5(offerNamespace, `${offerID}-${totalPayout}`);
}

export function createRewardID({
  externalID,
  provider,
}: {
  externalID: string | number,
  provider: string | number,
}): string {
  return uuidv5(offerNamespace, `${provider}-${externalID}`);
}

// ─── Category generation ──────────────────────────────────────────────────────

async function generateCategories({
  offerName,
  offerDescription,
  offerDevices,
  offerOperatingSystem,
  existingCategories,
}: {
  offerName: string,
  offerDescription: string,
  offerDevices: string[],
  offerOperatingSystem: string[],
  existingCategories: OfferType[],
}): Promise<OfferType[]> {
  try {
    const response = await genai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: `Below is the ONLY list of categories you can use to categorize the information I will provide to you.
      The categories are: ${Array.from(OfferTypeSet).join(', ')}

      You are NOT to categorize apps that mimic a casino as a "Casino" offer. Please reserve the Casino offer for websites or apps that require cash deposits & allow withdrawals.
      Reserve the "Finance" and "Banking" categories for offers that are related to banking, loans, or credit cards.

      Below is the information you are meant to categorize
      Name: ${offerName}
      Description: ${offerDescription}
      Devices: ${offerDevices.join(', ')}
      Operating System: ${offerOperatingSystem.join(', ')}
      Existing Categories: ${existingCategories.join(', ')}

      NEVER repeat the prompt, there should only EVER be the JSON array in your response.
      NEVER return any text before the JSON array, just the array itself.
      NEVER return markdown in your response, return a JSON array of the categories the information belongs to formatted like ["category1", "category2", "category3"].`,
    });

    let rawResponse = response.text ?? '';

    if (rawResponse.startsWith('```json')) {
      rawResponse = rawResponse.slice(7, -3).replaceAll('`', '');
    }

    const categories: OfferType[] = JSON.parse(rawResponse);

    return categories;
  } catch (err) {
    console.error(`Failed to generate categories for "${offerName}":`, err);

    return existingCategories;
  }
}

// ─── Core ingest pipeline ─────────────────────────────────────────────────────

type ProcessResult = {
  upserted: number,
  modified: number,
  failed: number,
  historyRecorded: number,
  categorized: number,
};

type ExistingOffer = {
  offerID: string,
  hash: string,
  offerType: OfferType[],
};

export async function processConvertedWorkersOffers({
  convertedOffers,
  successfulProviders,
}: {
  convertedOffers: IngestedOffer[],
  successfulProviders: InternalOffer['provider'][],
}): Promise<ProcessResult> {
  const { db } = getGlobalObject();
  const now = new Date();

  let upserted = 0;
  let modified = 0;
  let failed = 0;
  let historyRecorded = 0;
  let categorized = 0;

  if (convertedOffers.length === 0) {
    return { upserted, modified, failed, historyRecorded, categorized };
  }

  const existingMap = new Map<string, ExistingOffer>();
  const allIds = convertedOffers.map(o => o.offerID);

  for (let i = 0; i < allIds.length; i += PRELOAD_CHUNK_SIZE) {
    const chunk = allIds.slice(i, i + PRELOAD_CHUNK_SIZE);

    const docs = await db
      .collection<InternalOffer>(DatabaseCollections.offers)
      .find(
        {
          offerID: {
            $in: chunk
          }
        },
        {
          projection: {
            offerID: 1,
            hash: 1,
            offerType: 1
          }
        },
      )
      .toArray();

    for (const doc of docs) {
      existingMap.set(doc.offerID, { offerID: doc.offerID, hash: doc.hash, offerType: doc.offerType ?? [] });
    }
  }

  const ops: AnyBulkWriteOperation<InternalOffer>[] = [];
  const historyEntries: OfferHistory[] = [];
  const needsCategories: IngestedOffer[] = [];

  for (const offer of convertedOffers) {
    const { description, offerType, ...rest } = offer;

    const existing = existingMap.get(offer.offerID);

    if (!existing || existing.offerType.length === 0) {
      needsCategories.push(offer);
    }

    if (existing && existing.hash !== offer.hash) {
      historyEntries.push({
        offerID: offer.offerID,
        externalID: offer.externalID,
        provider: offer.provider,
        reward: offer.reward.map(r => ({
          rewardID: r.rewardID,
          externalID: r.externalID,
          value: r.value,
          revenue: r.revenue,
        })),
        hash: offer.hash,
        recordedAt: now,
      });
    }

    const $set: UpdateFilter<InternalOffer> = {
      ...rest,
      geoUnrestricted: offer.geos.length === 0,
      rawDescription: description,
      updatedAt: now,
    };

    const $setOnInsert: UpdateFilter<InternalOffer> = {
      description,
      offerType: offerType ?? [],
      createdAt: now,
    };

    ops.push({
      updateOne: {
        filter: { offerID: offer.offerID, provider: offer.provider },
        update: { $set, $setOnInsert },
        upsert: true,
      },
    });
  }

  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = ops.slice(i, i + BATCH_SIZE);

    try {
      const result = await db
        .collection<InternalOffer>(DatabaseCollections.offers)
        .bulkWrite(batch, { ordered: false });

      upserted += result.upsertedCount;
      modified += result.modifiedCount;

      if (result.hasWriteErrors()) {
        failed += result.getWriteErrorCount();
      }
    } catch (err) {
      console.error(`Offer upsert batch at index ${i} failed:`, err);
      failed += batch.length;
    }
  }

  if (historyEntries.length > 0) {
    try {
      for (let i = 0; i < historyEntries.length; i += BATCH_SIZE) {
        const batch = historyEntries.slice(i, i + BATCH_SIZE);
        await db.collection<OfferHistory>(DatabaseCollections.offerHistory).insertMany(batch, { ordered: false });
        historyRecorded += batch.length;
      }
    } catch (err) {
      console.error('Offer history insertMany failed:', err);
    }
  }

  if (successfulProviders.length > 0) {
    try {
      await db.collection<InternalOffer>(DatabaseCollections.offers).updateMany(
        {
          status: 'active',
          provider: { $in: successfulProviders },
          updatedAt: { $lt: now },
        },
        {
          $set: {
            status: 'inactive'
          }
        },
      );
    } catch (err) {
      console.error('Offer tombstone updateMany failed:', err);
    }
  }

  if (needsCategories.length > 0) {
    categorized = await enrichOfferCategories(needsCategories);
  }

  return { upserted, modified, failed, historyRecorded, categorized };
}

export async function enrichOfferCategories(offers: IngestedOffer[]): Promise<number> {
  const { db } = getGlobalObject();

  console.info(`Categorising ${offers.length} offer(s) via Gemini.`);

  const categoryOps: AnyBulkWriteOperation<InternalOffer>[] = [];

  for (let i = 0; i < offers.length; i += CATEGORY_BATCH_SIZE) {
    const batch = offers.slice(i, i + CATEGORY_BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async offer => {
        const categories = await generateCategories({
          offerName: offer.name,
          offerDescription: offer.description,
          offerDevices: offer.devices,
          offerOperatingSystem: offer.operatingSystem,
          existingCategories: offer.offerType ?? [],
        });

        return { offerID: offer.offerID, categories };
      }),
    );

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;

      categoryOps.push({
        updateOne: {
          filter: { offerID: result.value.offerID },
          update: { $set: { offerType: result.value.categories } },
        },
      });
    }
  }

  if (categoryOps.length === 0) return 0;

  let categorized = 0;

  try {
    for (let i = 0; i < categoryOps.length; i += BATCH_SIZE) {
      const batch = categoryOps.slice(i, i + BATCH_SIZE);
      const result = await db
        .collection<InternalOffer>(DatabaseCollections.offers)
        .bulkWrite(batch, { ordered: false });

      categorized += result.modifiedCount;
    }
  } catch (err) {
    console.error('Category bulkWrite failed:', err);
  }

  return categorized;
}
