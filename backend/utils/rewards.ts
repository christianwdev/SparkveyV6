// Constants
import DatabaseCollections from '../constants/DatabaseCollections';

// Utils
import { getGlobalObject } from './globalObject';

// Types
import type { AnyBulkWriteOperation, UpdateFilter } from 'mongodb';
import type InternalReward from 'types/Reward/InternalReward';

const BATCH_SIZE = 100;

type ProcessConvertedWorkersRewardsResult = {
  upserted: number;
  modified: number;
  failed: number;
};

export async function processConvertedWorkersRewards(
  {
    convertedRewards,
  }: {
    convertedRewards: InternalReward[],
  },
): Promise<ProcessConvertedWorkersRewardsResult> {
  const { db } = getGlobalObject();
  const now = new Date();

  const ops = convertedRewards.map((reward): AnyBulkWriteOperation<InternalReward> => {
    const $set: UpdateFilter<InternalReward> = {
      rewardName: reward.rewardName,
      description: reward.description,
      disclosure: reward.disclosure,
      countries: reward.countries,
      meta: reward.meta,
      updatedAt: now,
    };

    if (reward.image) {
      $set['image'] = reward.image;
    }

    const $setOnInsert = {
      rewardID: reward.rewardID,
      providerName: reward.providerName,
      status: reward.status,
      createdAt: now,
    };

    if (reward.categories !== undefined) {
      $setOnInsert['categories'] = reward.categories;
    }

    return {
      updateOne: {
        filter: {
          rewardID: reward.rewardID,
          providerName: reward.providerName,
        },
        update: {
          $set,
          $setOnInsert,
        },
        upsert: true,
      },
    };
  });

  let upserted = 0;
  let modified = 0;
  let failed = 0;

  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = ops.slice(i, i + BATCH_SIZE);

    try {
      const result = await db.collection<InternalReward>(DatabaseCollections.rewards).bulkWrite(batch, {
        ordered: false,
      });

      upserted += result.upsertedCount;
      modified += result.modifiedCount;

      if (result.hasWriteErrors()) {
        failed += result.getWriteErrorCount();
      }
    } catch (error) {
      console.error(`Failed to bulk upsert rewards batch starting at index ${i}:`, error);

      failed += batch.length;
    }
  }

  return { upserted, modified, failed };
}
