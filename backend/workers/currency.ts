// Constants
import RedisKeys from '../constants/RedisKeys';

// Utils
import { getGlobalObject } from '../utils/globalObject';

// Types
import type CurrencyRateMap from 'types/CurrencyRateMap';
import type CurrencyRatesPayload from 'types/CurrencyRatesPayload';

const MAIN_CURRENCY_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json';
const BACKUP_CURRENCY_URL = 'https://latest.currency-api.pages.dev/v1/currencies/usd.min.json';
const POLLING_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function cacheCurrencyRates(): Promise<[ err: true ] | [ err: false ]> {
  try {
    let currencyReq = await fetch(MAIN_CURRENCY_URL);

    if (!currencyReq.ok) {
      currencyReq = await fetch(BACKUP_CURRENCY_URL);

      if (!currencyReq.ok) return [ true ];
    }

    const currenciesResponse = await currencyReq.json();

    if (
      currenciesResponse === null
      || currenciesResponse === undefined
      || Array.isArray(currenciesResponse)
      || currenciesResponse.constructor !== Object
    ) {
      return [ true ];
    }

    // SAFETY: HTTP JSON is a plain object; usd is either a nested rate map or absent.
    const payload = currenciesResponse as CurrencyRatesPayload;
    const usdField = payload.usd;
    const rawCurrencies = (
      usdField !== null
      && usdField !== undefined
      && !Array.isArray(usdField)
      && usdField.constructor === Object
    )
      ? usdField
      : payload;

    const currencyRates: CurrencyRateMap = {};
    currencyRates.USD = 1;

    for (const [ currencyCode, currencyRate ] of Object.entries(rawCurrencies)) {
      const rate = Number(currencyRate);
      if (!Number.isFinite(rate) || rate <= 0) continue;

      currencyRates[currencyCode.toUpperCase()] = rate;
    }

    if (Object.keys(currencyRates).length < 2) return [ true ];

    const { redisClient } = getGlobalObject();

    await redisClient.set(RedisKeys.currencyRates, JSON.stringify(currencyRates));

    return [ false ];
  } catch (error) {
    console.error('Failed to cache currency rates', error);

    return [ true ];
  }
}

export default async function startCurrencyWorker() {
  console.log('Starting currency worker.');

  let lastPollDate = 0;

  const poll = async () => {
    lastPollDate = Date.now();
    const [ err ] = await cacheCurrencyRates();

    if (err) {
      lastPollDate = 0;
      console.error('Currency rates poll failed.');

      return;
    }

    console.info('Currency rates cached.');
  };

  await poll();

  setInterval(async () => {
    if (lastPollDate + POLLING_INTERVAL_MS > Date.now()) return;

    await poll();
  }, 60_000);
}
