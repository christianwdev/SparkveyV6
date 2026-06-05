// Constants
import DatabaseCollections from '../constants/DatabaseCollections';

// Utils
import { getGlobalObject } from './globalObject';

// Types
import type { AnyBulkWriteOperation, Document, UpdateFilter } from 'mongodb';
import type InternalReward from 'types/Reward/InternalReward';

const BATCH_SIZE = 100;
const FEATURED_REWARDS_LIMIT = 10;

type ProcessConvertedWorkersRewardsResult = {
  upserted: number;
  modified: number;
  failed: number;
};

type FetchRewardsByCategoryOptions = {
  limit?: number,
};

export async function fetchRewardsByCategory(
  categoryID: string,
  {
    limit,
  }: FetchRewardsByCategoryOptions = {},
): Promise<InternalReward[]> {
  const { db } = getGlobalObject();

  const pipeline: Document[] = [
    {
      $match: {
        status: 'active',
        categories: categoryID,
        disabledAt: { $exists: false },
      },
    },
    {
      $addFields: {
        sortPriority: { $ifNull: [ '$featuredSpot', Number.MAX_SAFE_INTEGER ] },
      },
    },
    {
      $sort: {
        sortPriority: 1,
        rewardName: 1,
      },
    },
  ];

  if (limit !== undefined) {
    pipeline.push({ $limit: limit });
  }

  pipeline.push({
    $project: {
      sortPriority: 0,
    },
  });

  return db.collection<InternalReward>(DatabaseCollections.rewards)
    .aggregate<InternalReward>(pipeline)
    .toArray();
}

export async function fetchFeaturedRewardsByCategory(
  categoryID: string,
  {
    limit = FEATURED_REWARDS_LIMIT,
  }: {
    limit?: number,
  } = {},
): Promise<InternalReward[]> {
  return fetchRewardsByCategory(categoryID, { limit });
}

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
