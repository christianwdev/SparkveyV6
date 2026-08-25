import { createHash, createHmac } from 'crypto';
import type { Context } from 'hono';
import type { PostbackQuery, PostbackValidationContext } from 'types/Postback/PostbackValidation';

type MockHeaderMap = {
  [name: string]: string,
};

/** Dummy parsed query for validateSecurity's unused `data` argument. */
export type UnusedPostbackQuery = {
  user: string,
  userID: string,
  value: string,
  reward: string,
  offerID: string,
  offerName: string,
  conversionID: string,
  usdValue: string,
  status: string,
  secret: string,
  clickid: string,
  event: 'reg',
};

export const UNUSED_POSTBACK_QUERY: UnusedPostbackQuery = {
  user: 'unused',
  userID: 'unused',
  value: '0',
  reward: '0',
  offerID: 'unused',
  offerName: 'unused',
  conversionID: 'unused',
  usdValue: '0',
  status: '1',
  secret: 'unused',
  clickid: 'unused',
  event: 'reg',
};

export function mockContext(headers: MockHeaderMap = {}): Context {
  const normalized: MockHeaderMap = {};
  for (const [ key, value ] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }

  const context = {
    req: {
      header: (name: string) => normalized[name.toLowerCase()],
    },
  };

  // SAFETY: test double only implements the Context.req.header method this suite calls
  return context as Context;
}

export function validationContext(
  query: PostbackQuery,
  remoteIP?: string,
): PostbackValidationContext {
  return { query, remoteIP };
}

/** Lootably documented formula: sha256(userID + ip + revenue + currencyReward + secret) */
export function lootablyHash(params: {
  user: string,
  userIP?: string,
  usdValue: string,
  value: string,
  secret: string,
}): string {
  const payload =
    params.user
    + (params.userIP ?? '')
    + params.usdValue
    + params.value
    + params.secret;

  return createHash('sha256').update(payload).digest('hex');
}

/** Ayet Studios: HMAC-SHA256 over PHP-style sorted query (excluding hash). */
export function ayetstudiosHmac(query: PostbackQuery, secret: string): string {
  const phpEncode = (value: string) => encodeURIComponent(value).replace(/%20/g, '+');

  const sorted = Object.entries(query)
    .filter(([ key ]) => key !== 'hash')
    .sort(([ a ], [ b ]) => a.localeCompare(b))
    .map(([ key, value ]) => `${key}=${phpEncode(value ?? '')}`)
    .join('&');

  return createHmac('sha256', secret).update(sorted).digest('hex');
}
