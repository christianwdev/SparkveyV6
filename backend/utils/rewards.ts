// Constants
import DatabaseCollections from '../constants/DatabaseCollections';

// Utils
import { getGlobalObject } from './globalObject';

// Types
import type { AnyBulkWriteOperation, Document, UpdateFilter } from 'mongodb';
import type InternalReward from 'types/Reward/InternalReward';
import type FunctionResponse from 'types/FunctionResponse';

const BATCH_SIZE = 100;
const FEATURED_REWARDS_LIMIT = 10;

export const CATEGORY_REWARDS_PAGE_SIZE = 20;
export const SPARKS_PER_USD = 1000;

export type ValidateRewardValueError =
  | 'invalidValue'
  | 'rewardUnavailable'
  | 'valueTooLow'
  | 'valueTooHigh'
  | 'valueNotAllowed';

export type ValidateUserBalanceError = 'insufficientBalance';

export function getRedemptionSparksCost(
  reward: InternalReward,
  value: number,
): number {
  switch (reward.providerName) {
    case 'ccpayment':
      return value;
    case 'tremendous':
      return value * SPARKS_PER_USD;
  }
}

export function validateRewardValue({
  reward,
  value,
}: {
  reward: InternalReward,
  value: unknown,
}): FunctionResponse<{ sparksCost: number }, ValidateRewardValueError> {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return { ok: false, error: 'invalidValue' };
  }

  if (reward.status !== 'active' || reward.disabledAt !== undefined) {
    return { ok: false, error: 'rewardUnavailable' };
  }

  switch (reward.providerName) {
    case 'ccpayment': {
      if (value < reward.meta.minimumAmount) {
        return { ok: false, error: 'valueTooLow' };
      }

      if (value > reward.meta.maximumAmount) {
        return { ok: false, error: 'valueTooHigh' };
      }

      break;
    }

    case 'tremendous': {
      if (reward.meta.type === 'variable') {
        if (value < reward.meta.minimumValue) {
          return { ok: false, error: 'valueTooLow' };
        }

        if (value > reward.meta.maximumValue) {
          return { ok: false, error: 'valueTooHigh' };
        }
      } else if (!reward.meta.denominations.includes(value)) {
        return { ok: false, error: 'valueNotAllowed' };
      }

      break;
    }
  }

  return {
    ok: true,
    data: {
      sparksCost: getRedemptionSparksCost(reward, value),
    },
  };
}

type ProcessConvertedWorkersRewardsResult = {
  upserted: number;
  modified: number;
  failed: number;
};

type FetchRewardsByCategoryOptions = {
  skip?: number,
  limit?: number,
};

export async function getRewardByID(rewardID: string): Promise<FunctionResponse<InternalReward>> {
  try {
    const { db } = getGlobalObject();

  const reward = await db.collection<InternalReward>(DatabaseCollections.rewards).findOne({ rewardID });

  if (!reward) return { ok: false, error: 'notFound' };

    return { ok: true, data: reward };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function fetchRewardsByCategory(
  categoryID: string,
  {
    skip = 0,
    limit,
  }: FetchRewardsByCategoryOptions = {},
): Promise<InternalReward[]> {
  const { db } = getGlobalObject();
  const pipeline: Document[] = [
    [
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
    ],
  ];

  if (skip > 0) {
    pipeline.push({ $skip: skip });
  }

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
  return fetchRewardsByCategory(categoryID, { skip: 0, limit });
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
