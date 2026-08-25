// Constants
import RedisKeys from '../constants/RedisKeys';

// Utils
import { getGlobalObject } from './globalObject';

// Types
import type CurrencyRateMap from 'types/CurrencyRateMap';

const CURRENCY_RATE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedCurrencyRates: CurrencyRateMap | null = null;
let cachedCurrencyRatesAt = 0;
let currencyRatesFetchInFlight: Promise<CurrencyRateMap | null> | null = null;

function normalizeCurrencyRates(rates: CurrencyRateMap): CurrencyRateMap | null {
  const normalizedRates = Object.entries(rates).reduce<CurrencyRateMap>((acc, [ currencyCode, currencyRate ]) => {
    if (!Number.isFinite(currencyRate) || currencyRate <= 0) return acc;

    acc[currencyCode.toUpperCase()] = currencyRate;

    return acc;
  }, {});

  if (Object.keys(normalizedRates).length < 1) return null;

  return normalizedRates;
}

export async function getCurrencyRates(): Promise<CurrencyRateMap | null> {
  if (
    cachedCurrencyRates
    && cachedCurrencyRatesAt + CURRENCY_RATE_CACHE_TTL_MS > Date.now()
  ) {
    return cachedCurrencyRates;
  }

  if (currencyRatesFetchInFlight) return currencyRatesFetchInFlight;

  currencyRatesFetchInFlight = (async () => {
    try {
      const { redisClient } = getGlobalObject();
      const currencyRatesRaw = await redisClient.get(RedisKeys.currencyRates);

      if (!currencyRatesRaw) return cachedCurrencyRates;

      const parsedRates = JSON.parse(currencyRatesRaw);
      if (parsedRates === null || parsedRates.constructor !== Object) return cachedCurrencyRates;

      // SAFETY: Redis JSON is written by the currency worker as a CurrencyRateMap.
      const normalizedRates = normalizeCurrencyRates(parsedRates as CurrencyRateMap);

      if (!normalizedRates) return cachedCurrencyRates;

      cachedCurrencyRates = normalizedRates;
      cachedCurrencyRatesAt = Date.now();

      return cachedCurrencyRates;
    } catch (error) {
      console.error('Failed to fetch currency rates', error);

      return cachedCurrencyRates;
    } finally {
      currencyRatesFetchInFlight = null;
    }
  })();

  return currencyRatesFetchInFlight;
}

/** Rates are USD→currency (e.g. AUD: 1.5 means 1 USD = 1.5 AUD). */
export function convertCurrencyToUSD(
  {
    amount,
    currencyCode,
    rates,
  }: {
    amount: number,
    currencyCode: string,
    rates: CurrencyRateMap,
  },
): number | null {
  const normalizedCode = currencyCode.toUpperCase();

  if (normalizedCode === 'USD') return amount;

  const currencyRate = rates[normalizedCode];

  if (!currencyRate || currencyRate <= 0) return null;

  return amount / currencyRate;
}
