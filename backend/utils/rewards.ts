// Constants
import DatabaseCollections from '../constants/DatabaseCollections';

// Utils
import { getGlobalObject } from './globalObject';

// Types
import type { AnyBulkWriteOperation, Document, UpdateFilter } from 'mongodb';
import type CatalogReward from 'types/Reward/CatalogReward';
import type InternalReward from 'types/Reward/InternalReward';
import type FunctionResponse from 'types/FunctionResponse';
import type RedeemCategoryID from 'types/Reward/RedeemCategoryID';

const BATCH_SIZE = 100;
const FEATURED_REWARDS_LIMIT = 10;

export const CATEGORY_REWARDS_PAGE_SIZE = 20;
export const SPARKS_PER_USD = 1000;

const GIFTCARD_PRESET_FIAT = [ 1, 3, 5, 10, 25, 50, 75, 100, 250, 500, 1000 ];
const CRYPTO_PRESET_SPARKS = [ 1000, 5000, 10000, 25000, 50000, 100000 ];

export const REDEEM_CATEGORY_META: Record<RedeemCategoryID, { categoryID: RedeemCategoryID, categoryName: string }> = {
  cash: {
    categoryID: 'cash',
    categoryName: 'Cash',
  },
  giftcards: {
    categoryID: 'giftcards',
    categoryName: 'Gift Cards',
  },
  crypto: {
    categoryID: 'crypto',
    categoryName: 'Crypto',
  },
};

export const REDEEM_CATEGORY_IDS = Object.keys(REDEEM_CATEGORY_META) as RedeemCategoryID[];

export function isRedeemCategoryID(value: string): value is RedeemCategoryID {
  return value in REDEEM_CATEGORY_META;
}

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
    case 'ccpayment':
      {
      if (value < reward.meta.minimumAmount) {
        return { ok: false, error: 'valueTooLow' };
      }

      if (value > reward.meta.maximumAmount) {
        return { ok: false, error: 'valueTooHigh' };
      }

      break;
    }

    case 'tremendous':
      {
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

function getGiftcardDenominations(reward: Extract<InternalReward, { providerName: 'tremendous' }>) {
  if (reward.meta.type === 'denomination') {
    return [ ...reward.meta.denominations ].sort((a, b) => a - b);
  }

  const { minimumValue, maximumValue } = reward.meta;

  return GIFTCARD_PRESET_FIAT.filter(
    amount => amount >= minimumValue && amount <= maximumValue,
  );
}

function getCryptoDenominations(reward: Extract<InternalReward, { providerName: 'ccpayment' }>) {
  return CRYPTO_PRESET_SPARKS.filter(
    amount => amount >= reward.meta.minimumAmount && amount <= reward.meta.maximumAmount,
  );
}

function getRewardImage(
  reward: InternalReward,
): CatalogReward['image'] {
  const images = (reward.image ?? [])
    .filter(image => !image.disabledAt)
    .sort((a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER));

  const card = images.find(image => image.type === 'card');
  if (card) return { src: card.src, type: 'card' };

  const logo = images.find(image => image.type === 'logo');
  if (logo) return { src: logo.src, type: 'logo' };

  return undefined;
}

function getRewardDisplayRange(reward: InternalReward): CatalogReward['displayRange'] {
  if (reward.providerName === 'ccpayment') {
    return {
      minimumFiat: reward.meta.minimumAmount / SPARKS_PER_USD,
      maximumFiat: reward.meta.maximumAmount / SPARKS_PER_USD,
      minimumSparks: reward.meta.minimumAmount,
      maximumSparks: reward.meta.maximumAmount,
      currencyCode: 'USD',
    };
  }

  const currencyCode = reward.meta.currencyCodes[0] ?? 'USD';

  if (reward.meta.type === 'denomination') {
    const denoms = [ ...reward.meta.denominations ].sort((a, b) => a - b);
    const minimumFiat = denoms[0] ?? 0;
    const maximumFiat = denoms[denoms.length - 1] ?? 0;

    return {
      minimumFiat,
      maximumFiat,
      minimumSparks: minimumFiat * SPARKS_PER_USD,
      maximumSparks: maximumFiat * SPARKS_PER_USD,
      currencyCode,
    };
  }

  const minimumFiat = reward.meta.minimumValue;
  const maximumFiat = reward.meta.maximumValue;

  return {
    minimumFiat,
    maximumFiat,
    minimumSparks: minimumFiat * SPARKS_PER_USD,
    maximumSparks: maximumFiat * SPARKS_PER_USD,
    currencyCode,
  };
}

export function toCatalogReward(reward: InternalReward): CatalogReward {
  const image = getRewardImage(reward);
  const displayRange = getRewardDisplayRange(reward);

  if (reward.providerName === 'ccpayment') {
    return {
      rewardID: reward.rewardID,
      rewardName: reward.rewardName,
      description: reward.description,
      disclosure: reward.disclosure,
      providerName: 'ccpayment',
      ...(image ? { image } : {}),
      displayRange,
      purchase: {
        valueUnit: 'sparks',
        denominations: getCryptoDenominations(reward),
        allowCustomAmount: true,
        minimumValue: reward.meta.minimumAmount,
        maximumValue: reward.meta.maximumAmount,
        sparksPerUnit: 1,
        requiresWalletAddress: true,
      },
    };
  }

  const allowCustomAmount = reward.meta.type === 'variable';

  return {
    rewardID: reward.rewardID,
    rewardName: reward.rewardName,
    description: reward.description,
    disclosure: reward.disclosure,
    providerName: 'tremendous',
    ...(image ? { image } : {}),
    displayRange,
    purchase: {
      valueUnit: 'fiat',
      denominations: getGiftcardDenominations(reward),
      allowCustomAmount,
      ...(allowCustomAmount
        ? {
          minimumValue: reward.meta.minimumValue,
          maximumValue: reward.meta.maximumValue,
        }
        : {}),
      sparksPerUnit: SPARKS_PER_USD,
      currencyCode: reward.meta.currencyCodes[0] ?? 'USD',
      requiresWalletAddress: false,
    },
  };
}

export function toCatalogRewards(rewards: InternalReward[]): CatalogReward[] {
  return rewards.map(toCatalogReward);
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

    const reward = await db.collection<InternalReward>(DatabaseCollections.rewards).findOne({
      rewardID,
    });

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
