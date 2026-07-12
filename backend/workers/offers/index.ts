import LootablyWorker from './lootably';
import AyetStudioWorker from './ayetstudio';
import FastAskWorker from './fastask';
import { processConvertedWorkersOffers } from '../../utils/offers/ingest';
import { getGlobalObject } from '../../utils/globalObject';
import { LockError } from '../../utils/distributedLock';

import type { IngestedOffer } from 'types/Offer/InternalOffer';
import type InternalOffer from 'types/Offer/InternalOffer';

const POLLING_INTERVAL = 60 * 60 * 1000; // 1 hour
const LOCK_KEY = 'offers:ingest';
const LOCK_TTL_MS = 55 * 60 * 1000; // 55 minutes — slightly under the poll interval

let lastPollDate = Date.now();

async function ingestOffers() {
  const { distributedLock } = getGlobalObject();

  if (!distributedLock) {
    console.error('distributedLock is not initialised — skipping offers ingest');

    return;
  }

  try {
    await distributedLock(
      async () => {
        console.info('Offers ingest started');

        const [
          [ lootablyErr, lootablyOffers ],
          [ ayetErr, ayetOffers ],
          [ fastaskErr, fastaskOffers ],
        ] = await Promise.all([
          LootablyWorker(),
          AyetStudioWorker(),
          FastAskWorker(),
        ]);

        if (lootablyErr) console.warn('Lootably worker failed — skipping provider');
        if (ayetErr) console.warn('AyetStudio worker failed — skipping provider');
        if (fastaskErr) console.warn('FastAsk/Waxrewards worker failed — skipping provider');

        const convertedOffers: IngestedOffer[] = [];
        const successfulProviders: InternalOffer['provider'][] = [];

        if (!lootablyErr) {
          convertedOffers.push(...lootablyOffers);
          successfulProviders.push('lootably');
        }

        if (!ayetErr) {
          convertedOffers.push(...ayetOffers);
          successfulProviders.push('ayetstudios');
        }

        if (!fastaskErr) {
          convertedOffers.push(...fastaskOffers);
          successfulProviders.push('waxrewards');
        }

        if (convertedOffers.length === 0) {
          console.warn('Offers ingest: all providers failed, skipping DB writes');

          return;
        }

        const { upserted, modified, failed, historyRecorded, categorized } =
          await processConvertedWorkersOffers({ convertedOffers, successfulProviders });

        console.info(
          `Offers ingest complete — ${upserted} upserted, ${modified} updated, ${failed} failed, ${historyRecorded} history records, ${categorized} categorised`,
        );
      },
      { key: LOCK_KEY, ttlMs: LOCK_TTL_MS },
    );
  } catch (err: unknown) {
    if (err instanceof LockError) {
      console.info('Offers ingest skipped — another instance is running');

      return;
    }

    console.error('Offers ingest encountered an unexpected error:', err);
  }
}

export default async function startOffersWorkers() {
  await ingestOffers();

  lastPollDate = Date.now();

  setInterval(async () => {
    if (lastPollDate + POLLING_INTERVAL > Date.now()) return;

    lastPollDate = Date.now();

    await ingestOffers();
  }, 60_000);
}
