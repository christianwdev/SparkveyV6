import TremendousCashProductIDs from '../constants/TremendousCashProductIDs';
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
const TREMENDOUS_CASH_PRODUCT_IDS = new Set<string>(TremendousCashProductIDs);

export const CATEGORY_REWARDS_PAGE_SIZE = 20;
export const SPARKS_PER_USD = 1000;

const GIFTCARD_PRESET_FIAT = [ 1, 3, 5, 10, 25, 50, 75, 100, 250, 500, 1000 ];
const CRYPTO_PRESET_SPARKS = [ 1000, 5000, 10000, 25000, 50000, 100000 ];

type RedeemCategoryMeta = {
  categoryID: RedeemCategoryID,
  categoryName: string,
};

export const REDEEM_CATEGORY_META = {
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
} satisfies Record<RedeemCategoryID, RedeemCategoryMeta>;

export const REDEEM_CATEGORY_IDS: RedeemCategoryID[] = [ 'cash', 'giftcards', 'crypto' ];

export function isRedeemCategoryID(value: string): value is RedeemCategoryID {
  return value in REDEEM_CATEGORY_META;
}

export type ValidateRewardValueError =
  | 'invalidValue'
  | 'rewardUnavailable'
  | 'valueTooLow'
  | 'valueTooHigh'
  | 'valueNotAllowed'
  | 'currencyRateUnavailable';

export type ValidateUserBalanceError = 'insufficientBalance';

const CASH_DEFAULT_FEE_RATE = 0.05;

export function getRewardFeeRate(reward: InternalReward): number {
  const feeRate = reward.feeRate;
  if (feeRate !== undefined && Number.isFinite(feeRate)) return feeRate;
  if (reward.categories?.includes('cash')) return CASH_DEFAULT_FEE_RATE;
  if (
    reward.providerName === 'tremendous'
    && TREMENDOUS_CASH_PRODUCT_IDS.has(reward.rewardID)
  ) {
    return CASH_DEFAULT_FEE_RATE;
  }

  return 0;
}

export function getRewardFeeAmount(
  {
    value,
    feeRate,
  }: {
    value: number,
    feeRate: number,
  },
): number {
  if (feeRate <= 0) return 0;

  return Math.round(value * feeRate * 100) / 100;
}

/** Base Sparks for a Tremendous face value (FX already baked in at ingest). */
export function getTremendousFaceSparks(
  reward: Extract<InternalReward, { providerName: 'tremendous' }>,
  value: number,
): number | null {
  if (reward.meta.type === 'denomination') {
    const index = reward.meta.denominations.indexOf(value);

    if (index < 0) return null;

    const mapped = reward.meta.denominationSparksValues?.[index];

    if (!Number.isFinite(mapped) || mapped <= 0) {
      return null;
    }

    return mapped;
  }

  const referenceValue = reward.meta.minimumValue > 0
    ? reward.meta.minimumValue
    : reward.meta.maximumValue;
  const referenceSparks = reward.meta.minimumSparksValue > 0
    ? reward.meta.minimumSparksValue
    : reward.meta.maximumSparksValue;

  if (
    referenceValue <= 0
    || !Number.isFinite(referenceSparks)
    || referenceSparks <= 0
  ) {
    return null;
  }

  const usdPerUnit = (referenceSparks / SPARKS_PER_USD) / referenceValue;

  return Math.round(value * usdPerUnit * SPARKS_PER_USD);
}

export function getRedemptionSparksValue(
  reward: InternalReward,
  value: number,
): number | null {
  switch (reward.providerName) {
    case 'ccpayment':
      return value;
    case 'tremendous':
      return getTremendousFaceSparks(reward, value);
  }
}

export function getRedemptionSparksCost(
  reward: InternalReward,
  value: number,
): number | null {
  const feeRate = getRewardFeeRate(reward);
  const faceSparks = getRedemptionSparksValue(reward, value);

  if (faceSparks === null) return null;

  switch (reward.providerName) {
    case 'ccpayment':
      {
      const feeAmount = getRewardFeeAmount({ value: faceSparks, feeRate });

      return Math.round(faceSparks + feeAmount);
    }
    case 'tremendous':
      return Math.round(faceSparks * (1 + feeRate));
  }
}

export function getRedemptionUsdValue(
  reward: InternalReward,
  value: number,
): number | null {
  const sparksValue = getRedemptionSparksValue(reward, value);

  if (sparksValue === null) return null;

  return sparksValue / SPARKS_PER_USD;
}

export function isRewardAvailableInCountry(
  reward: InternalReward,
  country: string | undefined,
): boolean {
  if (!reward.countries || reward.countries.length === 0) return true;
  if (reward.countries.includes('*')) return true;
  if (!country) return false;

  return reward.countries.includes(country);
}

export function validateRewardValue({
  reward,
  value,
}: {
  reward: InternalReward,
  value: unknown,
}): FunctionResponse<{ sparksCost: number }, ValidateRewardValueError> {
  if (!Number.isFinite(value)) {
    return { ok: false, error: 'invalidValue' };
  }

  const numericValue = Number(value);
  if (numericValue <= 0) {
    return { ok: false, error: 'invalidValue' };
  }

  if (reward.status !== 'active' || reward.disabledAt !== undefined) {
    return { ok: false, error: 'rewardUnavailable' };
  }

  switch (reward.providerName) {
    case 'ccpayment':
      {
      if (numericValue < reward.meta.minimumAmount) {
        return { ok: false, error: 'valueTooLow' };
      }

      if (numericValue > reward.meta.maximumAmount) {
        return { ok: false, error: 'valueTooHigh' };
      }

      break;
    }

    case 'tremendous':
      {
      if (reward.meta.type === 'variable') {
        if (numericValue < reward.meta.minimumValue) {
          return { ok: false, error: 'valueTooLow' };
        }

        if (numericValue > reward.meta.maximumValue) {
          return { ok: false, error: 'valueTooHigh' };
        }
      } else if (!reward.meta.denominations.includes(numericValue)) {
        return { ok: false, error: 'valueNotAllowed' };
      }

      break;
    }
  }

  const sparksCost = getRedemptionSparksCost(reward, numericValue);

  if (sparksCost === null) {
    return { ok: false, error: 'currencyRateUnavailable' };
  }

  return {
    ok: true,
    data: {
      sparksCost,
    },
  };
}

function getGiftcardDenominations(reward: Extract<InternalReward, { providerName: 'tremendous' }>) {
  if (reward.meta.type === 'denomination') {
    return [ ...reward.meta.denominations ];
  }

  const { minimumValue, maximumValue } = reward.meta;

  return GIFTCARD_PRESET_FIAT.filter(
    amount => amount >= minimumValue && amount <= maximumValue,
  );
}

function getTremendousSparksPerUnit(
  reward: Extract<InternalReward, { providerName: 'tremendous' }>,
): number {
  if (reward.meta.type === 'variable') {
    if (reward.meta.minimumValue > 0 && reward.meta.minimumSparksValue > 0) {
      return reward.meta.minimumSparksValue / reward.meta.minimumValue;
    }

    return SPARKS_PER_USD;
  }

  const denomination = reward.meta.denominations[0];
  const sparks = reward.meta.denominationSparksValues[0];

  if (Number.isFinite(denomination) && denomination > 0 && Number.isFinite(sparks)) {
    return sparks / denomination;
  }

  return SPARKS_PER_USD;
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

function hasTremendousFxPricing(
  reward: Extract<InternalReward, { providerName: 'tremendous' }>,
): boolean {
  if (reward.meta.type === 'denomination') {
    return Array.isArray(reward.meta.denominationSparksValues)
      && reward.meta.denominationSparksValues.length === reward.meta.denominations.length
      && reward.meta.denominationSparksValues.every(
        sparks => Number.isFinite(sparks) && sparks > 0,
      );
  }

  return Number.isFinite(reward.meta.minimumSparksValue)
    && Number.isFinite(reward.meta.maximumSparksValue)
    && reward.meta.minimumSparksValue > 0
    && reward.meta.maximumSparksValue > 0;
}

function getRewardDisplayRange(reward: InternalReward): CatalogReward['displayRange'] | null {
  const feeRate = getRewardFeeRate(reward);
  const costMultiplier = 1 + feeRate;

  if (reward.providerName === 'ccpayment') {
    const minimumSparks = Math.round(reward.meta.minimumAmount * costMultiplier);
    const maximumSparks = Math.round(reward.meta.maximumAmount * costMultiplier);

    return {
      minimumFiat: minimumSparks / SPARKS_PER_USD,
      maximumFiat: maximumSparks / SPARKS_PER_USD,
      minimumSparks,
      maximumSparks,
      currencyCode: 'USD',
    };
  }

  if (!hasTremendousFxPricing(reward)) return null;

  const currencyCode = reward.meta.currencyCode ?? reward.meta.currencyCodes[0] ?? 'USD';

  if (reward.meta.type === 'denomination') {
    const denoms = reward.meta.denominations;
    const sparksValues = reward.meta.denominationSparksValues;
    const minimumFiat = denoms[0] ?? 0;
    const maximumFiat = denoms[denoms.length - 1] ?? 0;
    const minimumFaceSparks = sparksValues[0];
    const maximumFaceSparks = sparksValues[sparksValues.length - 1];

    return {
      minimumFiat,
      maximumFiat,
      minimumSparks: Math.round(minimumFaceSparks * costMultiplier),
      maximumSparks: Math.round(maximumFaceSparks * costMultiplier),
      currencyCode,
    };
  }

  return {
    minimumFiat: reward.meta.minimumValue,
    maximumFiat: reward.meta.maximumValue,
    minimumSparks: Math.round(reward.meta.minimumSparksValue * costMultiplier),
    maximumSparks: Math.round(reward.meta.maximumSparksValue * costMultiplier),
    currencyCode,
  };
}

export function toCatalogReward(reward: InternalReward): CatalogReward | null {
  const image = getRewardImage(reward);
  const displayRange = getRewardDisplayRange(reward);
  const feeRate = getRewardFeeRate(reward);

  if (!displayRange) return null;

  if (reward.providerName === 'ccpayment') {
    const catalog: CatalogReward = {
      rewardID: reward.rewardID,
      rewardName: reward.rewardName,
      description: reward.description,
      disclosure: reward.disclosure,
      providerName: 'ccpayment',
      feeRate,
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
    if (image) catalog.image = image;

    return catalog;
  }

  const sparksPerUnit = getTremendousSparksPerUnit(reward);
  const currencyCode = reward.meta.currencyCode ?? reward.meta.currencyCodes[0] ?? 'USD';

  if (reward.meta.type === 'variable') {
    const denominations = getGiftcardDenominations(reward);
    const sparksValues: number[] = [];

    for (const denom of denominations) {
      const sparks = getTremendousFaceSparks(reward, denom);
      if (sparks === null) return null;
      sparksValues.push(sparks);
    }

    const catalog: CatalogReward = {
      rewardID: reward.rewardID,
      rewardName: reward.rewardName,
      description: reward.description,
      disclosure: reward.disclosure,
      providerName: 'tremendous',
      feeRate,
      displayRange,
      purchase: {
        valueUnit: 'fiat',
        denominations,
        allowCustomAmount: true,
        minimumValue: reward.meta.minimumValue,
        maximumValue: reward.meta.maximumValue,
        sparksPerUnit,
        sparksValues,
        currencyCode,
        requiresWalletAddress: false,
      },
    };
    if (image) catalog.image = image;

    return catalog;
  }

  const catalog: CatalogReward = {
    rewardID: reward.rewardID,
    rewardName: reward.rewardName,
    description: reward.description,
    disclosure: reward.disclosure,
    providerName: 'tremendous',
    feeRate,
    displayRange,
    purchase: {
      valueUnit: 'fiat',
      denominations: getGiftcardDenominations(reward),
      allowCustomAmount: false,
      sparksPerUnit,
      sparksValues: [ ...reward.meta.denominationSparksValues ],
      currencyCode,
      requiresWalletAddress: false,
    },
  };
  if (image) catalog.image = image;

  return catalog;
}

export function toCatalogRewards(rewards: InternalReward[]): CatalogReward[] {
  return rewards
    .map(toCatalogReward)
    .filter((reward): reward is CatalogReward => reward !== null);
}

type ProcessConvertedWorkersRewardsResult = {
  upserted: number;
  modified: number;
  failed: number;
};

type FetchRewardsByCategoryOptions = {
  country?: string,
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

function buildCountryMatch(country: string | undefined): Document {
  if (!country) {
    return {
      $or: [
        { countries: { $exists: false } },
        { countries: { $size: 0 } },
        { countries: '*' },
      ],
    };
  }

  return {
    $or: [
      { countries: { $exists: false } },
      { countries: { $size: 0 } },
      { countries: '*' },
      { countries: country },
    ],
  };
}

export async function fetchRewardsByCategory(
  categoryID: string,
  {
    country,
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
        ...buildCountryMatch(country),
      },
    },
    {
      $addFields: {
        sortPriority: { $ifNull: [ '$featuredSpot', Number.MAX_SAFE_INTEGER ] },
      },
    },
    {
      // `_id` breaks ties on sortPriority/rewardName so skip/limit pagination
      // returns a stable order across requests — without it, Mongo can reorder
      // tied documents between pages and cause duplicate or skipped rewards.
      $sort: {
        sortPriority: 1,
        rewardName: 1,
        _id: 1,
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
    country,
    limit = FEATURED_REWARDS_LIMIT,
  }: {
    country?: string,
    limit?: number,
  } = {},
): Promise<InternalReward[]> {
  return fetchRewardsByCategory(categoryID, { country, skip: 0, limit });
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

    if (reward.categories !== undefined) {
      $set['categories'] = reward.categories;
    }

    if (reward.feeRate !== undefined) {
      $set['feeRate'] = reward.feeRate;
    }

    const $setOnInsert = {
      rewardID: reward.rewardID,
      providerName: reward.providerName,
      status: reward.status,
      createdAt: now,
    };

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
