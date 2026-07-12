// Constants
import DatabaseCollections from '../constants/DatabaseCollections';
import SocketEmits from '../constants/SocketEmits';
import SocketRooms from '../constants/SocketRooms';

// Utils
import { getGlobalObject } from './globalObject';

// Types
import type { Db } from 'mongodb';
import type SiteStatistics from 'types/SiteStatistics';
import type InternalEarning from 'types/Earnings/InternalEarning';

export const SITE_STATISTICS_ID = 'site' as const;

const NON_REVERSED_STATUSES = [ 'completed', 'held', 'providerPending' ] as const;

async function aggregateTotalEarnedUsd(db: Db): Promise<number> {
  const [ result ] = await db
    .collection<InternalEarning>(DatabaseCollections.userEarnings)
    .aggregate<{ total: number }>([
      {
        $match: {
          status: { $in: [ ...NON_REVERSED_STATUSES ] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$usdValue' },
        },
      },
    ])
    .toArray();

  return result?.total ?? 0;
}

function emitSiteStatistics(totalEarnedUsd: number): void {
  const { io } = getGlobalObject();
  io.to(SocketRooms.landing).emit(SocketEmits.siteStatistics, { totalEarnedUsd });
}

/** Seeds the singleton site stats doc from earnings if it does not exist yet. */
export async function ensureSiteStatistics(db: Db): Promise<void> {
  const totalEarnedUsd = await aggregateTotalEarnedUsd(db);
  const now = new Date();

  await db.collection<SiteStatistics>(DatabaseCollections.siteStatistics).updateOne(
    { _id: SITE_STATISTICS_ID },
    {
      $setOnInsert: {
        _id: SITE_STATISTICS_ID,
        totalEarnedUsd,
        updatedAt: now,
      },
    },
    { upsert: true },
  );
}

export async function getTotalEarnedUsd(): Promise<number> {
  const { db } = getGlobalObject();
  const collection = db.collection<SiteStatistics>(DatabaseCollections.siteStatistics);

  const existing = await collection.findOne({ _id: SITE_STATISTICS_ID });
  if (existing) return existing.totalEarnedUsd;

  await ensureSiteStatistics(db);

  const seeded = await collection.findOne({ _id: SITE_STATISTICS_ID });

  return seeded?.totalEarnedUsd ?? 0;
}

/** Atomically adjust the platform total. Positive on new earnings, negative on reversals. */
export async function adjustTotalEarnedUsd(deltaUsd: number): Promise<number> {
  const { db } = getGlobalObject();
  const collection = db.collection<SiteStatistics>(DatabaseCollections.siteStatistics);

  if (deltaUsd !== 0) {
    const updated = await collection.findOneAndUpdate(
      { _id: SITE_STATISTICS_ID },
      {
        $inc: { totalEarnedUsd: deltaUsd },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' },
    );

    if (updated) {
      emitSiteStatistics(updated.totalEarnedUsd);

      return updated.totalEarnedUsd;
    }

    // Doc missing — seed from aggregate (already includes this earning/reversal). Do not $inc again.
    await ensureSiteStatistics(db);
  }

  const totalEarnedUsd = await getTotalEarnedUsd();
  emitSiteStatistics(totalEarnedUsd);

  return totalEarnedUsd;
}
