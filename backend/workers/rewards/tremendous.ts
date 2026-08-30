// Constants
import TremendousCashProductIDs from '../../constants/TremendousCashProductIDs';

// Utils
import { convertCurrencyToUSD, getCurrencyRates } from '../../utils/currency';
import { readEnv } from '../../utils/env';

// Types
import type ExternalTremendousReward from 'types/External/Tremendous/TremendousReward';
import type InternalReward from 'types/Reward/InternalReward';
import type RedeemCategoryID from 'types/Reward/RedeemCategoryID';
import type { TremendousReward as InternalTremendousReward, DenominationTremendousReward, VariableTremendousReward } from 'types/Reward/TremendousReward';

const TREMENDOUS_ENDPOINT = 'https://api.tremendous.com';
const TREMENDOUS_API_KEY = readEnv('TREMENDOUS_API_KEY');
const SPARKS_PER_USD = 1000;

const TREMENDOUS_CASH_PRODUCT_IDS = new Set<string>(TremendousCashProductIDs);
const CASH_FEE_RATE = 0.05;

function mapTremendousRewardDefaults(rewardID: string): {
  categories: RedeemCategoryID[],
  feeRate: number,
} {
  if (TREMENDOUS_CASH_PRODUCT_IDS.has(rewardID)) {
    return {
      categories: [ 'cash' ],
      feeRate: CASH_FEE_RATE,
    };
  }

  return {
    categories: [ 'giftcards' ],
    feeRate: 0,
  };
}

export default async function TremendousWorker(): Promise<[ error: true ] | [ error: false, data: InternalReward[] ]> {
  try {
    const [ error, rewards ] = await fetchTremendousRewards();

    if (error) {
      console.error(error);

      return [ true ];
    }

    return [ false, rewards ];
  } catch (err) {
    console.error(`We encountered an error when trying to poll Tremendous rewards ${err}`);

    if (process.env.NODE_ENV === 'development') console.error(err);

    return [ true ];
  }
}

async function fetchTremendousRewards(): Promise<[ error: true ] | [ error: false, data: InternalReward[], hasMore: boolean ]> {
  const currencyRates = await getCurrencyRates();

  if (!currencyRates) {
    console.error('Skipping Tremendous ingest — currency rates unavailable.');

    return [ true ];
  }

  const httpRequest = await fetch(`${TREMENDOUS_ENDPOINT}/api/v2/products`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TREMENDOUS_API_KEY}`,
    },
  });

  if (httpRequest.status !== 200) {
    if (process.env.NODE_ENV === 'development') console.log(`Tremendous API responded with a status code of ${httpRequest.status}`);

    return [ true ];
  }

  type SuccessfulResponseType = {
    products: ExternalTremendousReward[],
  };

  type FailureResponseType = {
    status: string,
    errors: {
      message: string,
      payload: unknown,
    },
  };

  const rewardsJSON: SuccessfulResponseType | FailureResponseType = await httpRequest.json();

  if ('errors' in rewardsJSON) {
    if (process.env.NODE_ENV === 'development') console.log(`Tremendous API responded with ${JSON.stringify(rewardsJSON)}`);

    return [ true ];
  }

  const tremendousRewards = rewardsJSON.products;
  const convertedRewards: InternalReward[] = [];

  for (const reward of tremendousRewards) {
    if (reward.category === 'charity') continue;

    const normalizedSkus = reward.skus.filter(sku => (
      typeof sku.min === 'number'
      && typeof sku.max === 'number'
      && sku.min > 0
      && sku.max > 0
    ));

    if (normalizedSkus.length < 1) continue;

    let rewardType: InternalTremendousReward['meta']['type'];

    if (normalizedSkus.length === 1) {
      const singularSku = normalizedSkus[0];

      if (singularSku.min === singularSku.max) {
        rewardType = 'denomination';
      } else {
        rewardType = 'variable';
      }
    } else {
      rewardType = 'denomination';
    }

    if (rewardType === 'denomination') {
      const built = buildDenominationTremendousReward(reward, normalizedSkus, currencyRates);

      if (built) convertedRewards.push(built);
    } else if (rewardType === 'variable') {
      const built = buildVariableTremendousReward(reward, normalizedSkus, currencyRates);

      if (built) convertedRewards.push(built);
    }
  }

  return [ false, convertedRewards, false ];
}

function mapTremendousImages(
  images: ExternalTremendousReward['images'],
): VariableTremendousReward['image'] {
  const mapped = images
    .filter((image): image is { src: string, type: 'card' | 'logo' } => (
      typeof image.src === 'string'
      && image.src.length > 0
      && (image.type === 'card' || image.type === 'logo')
    ))
    .map((image, index) => ({
      src: image.src,
      type: image.type,
      priority: index,
    }));

  return mapped.length > 0 ? mapped : undefined;
}

function buildVariableTremendousReward(
  reward: ExternalTremendousReward,
  skus: ExternalTremendousReward['skus'],
  rates: Record<string, number>,
): VariableTremendousReward | null {
  const { categories, feeRate } = mapTremendousRewardDefaults(reward.id);
  const currencyCode = (reward.currency_codes[0] || 'USD').toUpperCase();
  const minimumValue = skus[0].min;
  const maximumValue = skus[0].max;
  const image = mapTremendousImages(reward.images);

  const minimumValueInUSD = convertCurrencyToUSD({
    amount: minimumValue,
    currencyCode,
    rates,
  });
  const maximumValueInUSD = convertCurrencyToUSD({
    amount: maximumValue,
    currencyCode,
    rates,
  });

  if (minimumValueInUSD === null || maximumValueInUSD === null) {
    console.warn(`Skipping Tremendous reward "${reward.id}" due to missing "${currencyCode}" conversion rate.`);

    return null;
  }

  return {
    rewardID: reward.id,
    rewardName: reward.name,
    description: reward.description,
    disclosure: reward.disclosure,
    countries: reward.countries.map(country => country.abbr),
    categories,
    feeRate,
    ...(image ? { image } : {}),
    meta: {
      type: 'variable',
      rewardID: reward.id,
      currencyCodes: reward.currency_codes,
      currencyCode,
      minimumValue,
      maximumValue,
      minimumSparksValue: Math.round(minimumValueInUSD * SPARKS_PER_USD),
      maximumSparksValue: Math.round(maximumValueInUSD * SPARKS_PER_USD),
    },
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    providerName: 'tremendous',
  };
}

function buildDenominationTremendousReward(
  reward: ExternalTremendousReward,
  skus: ExternalTremendousReward['skus'],
  rates: Record<string, number>,
): DenominationTremendousReward | null {
  const { categories, feeRate } = mapTremendousRewardDefaults(reward.id);
  const currencyCode = (reward.currency_codes[0] || 'USD').toUpperCase();
  const denominations = skus.map(sku => sku.min);
  const denominationSparksValues: number[] = [];
  const image = mapTremendousImages(reward.images);

  for (const denomination of denominations) {
    const valueInUSD = convertCurrencyToUSD({
      amount: denomination,
      currencyCode,
      rates,
    });

    if (valueInUSD === null) {
      console.warn(`Skipping Tremendous reward "${reward.id}" due to missing "${currencyCode}" conversion rate.`);

      return null;
    }

    denominationSparksValues.push(Math.round(valueInUSD * SPARKS_PER_USD));
  }

  return {
    rewardID: reward.id,
    rewardName: reward.name,
    description: reward.description,
    disclosure: reward.disclosure,
    countries: reward.countries.map(country => country.abbr),
    categories,
    feeRate,
    ...(image ? { image } : {}),
    meta: {
      type: 'denomination',
      currencyCodes: reward.currency_codes,
      currencyCode,
      denominations,
      denominationSparksValues,
    },
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    providerName: 'tremendous',
  };
}
