import { createHash, createHmac } from 'crypto';
import type { Context } from 'hono';
import type { PostbackQuery, PostbackValidationContext } from 'types/Postback/PostbackValidation';

export function mockContext(headers: Record<string, string> = {}): Context {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([ key, value ]) => [ key.toLowerCase(), value ]),
  );

  return {
    req: {
      header: (name: string) => normalized[name.toLowerCase()],
    },
  } as unknown as Context;
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
