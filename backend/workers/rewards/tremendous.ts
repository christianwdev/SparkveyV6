// Utils
import { getGlobalObject } from '../../utils/globalObject';

// Types
import type ExternalTremendousReward from 'types/External/Tremendous/TremendousReward';
import type InternalReward from 'types/Reward/InternalReward';
import type { TremendousReward as InternalTremendousReward, DenominationTremendousReward, VariableTremendousReward } from 'types/Reward/TremendousReward';

const TREMENDOUS_ENDPOINT = 'https://api.tremendous.com';
const TREMENDOUS_API_KEY = process.env.TREMENDOUS_API_KEY;

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
  const {
    db,
  } = getGlobalObject();

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
    }
  };

  const rewardsJSON: SuccessfulResponseType | FailureResponseType = await httpRequest.json();

  // Content key doesn't exist.
  if ('errors' in rewardsJSON) {
    if (process.env.NODE_ENV === 'development') console.log(`Loyalize API responded with ${JSON.stringify(rewardsJSON)}`);

    return [ true ];
  }

  const tremendousRewards = rewardsJSON.products;
  const convertedRewards: InternalReward[] = [];

  for (const reward of tremendousRewards) {
    if (reward.skus.length <= 0) continue;

    let rewardType: InternalTremendousReward['meta']['type'];

    if (reward.skus.length === 1) {
      const singularSku = reward.skus[0];

      if (singularSku.min === singularSku.max) {
        rewardType = 'denomination';
      } else {
        rewardType = 'variable';
      }
    } else {
      rewardType = 'denomination';
    }

    if (rewardType === 'denomination') {
      convertedRewards.push(buildDenominationTremendousReward(reward));
    } else if (rewardType === 'variable') {
      convertedRewards.push(buildVariableTremendousReward(reward));
    }
  }

  return [ false, convertedRewards, false ];
}

function buildVariableTremendousReward(
  reward: ExternalTremendousReward,
) {
  const builtReward: VariableTremendousReward = {
    rewardID: reward.id,
    rewardName: reward.name,
    description: reward.description,
    disclosure: reward.disclosure,
    countries: reward.countries.map((country) => country.abbr),
    categories: [ ],
    meta: {
      type: 'variable',
      rewardID: reward.id,
      currencyCodes: reward.currency_codes,
      minimumValue: reward.skus[0].min,
      maximumValue: reward.skus[0].max,
    },
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    providerName: 'tremendous',
  };

  return builtReward;
}

function buildDenominationTremendousReward(
  reward: ExternalTremendousReward,
) {
  const builtReward: DenominationTremendousReward = {
    rewardID: reward.id,
    rewardName: reward.name,
    description: reward.description,
    disclosure: reward.disclosure,
    countries: reward.countries.map((country) => country.abbr),
    categories: [ ],
    meta: {
      type: 'denomination',
      currencyCodes: reward.currency_codes,
      denominations: reward.skus.map((sku) => sku.min),
    },
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    providerName: 'tremendous',
  };

  return builtReward;
}

function convertCurrencyToUSD(
  {
    amount,
    currencyCode,
    rates,
  }: {
    amount: number,
    currencyCode: string,
    rates: Record<string, number>,
  },
): number | null {
  if (currencyCode === 'USD') return amount;

  const currencyRate = rates[currencyCode];

  if (!currencyRate || currencyRate <= 0) return null;

  return amount / currencyRate;
}
