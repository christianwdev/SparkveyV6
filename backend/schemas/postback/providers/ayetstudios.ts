import { createHmac } from 'crypto';
import { z } from 'zod';

import type { Context } from 'hono';

import config from 'backend/config/config';
import { parseRevenue } from 'backend/utils/number';
import { isIPWhitelisted } from 'backend/utils/ip';

import { PostbackProvider } from '../PostbackProvider';
import type { NormalizedPostbackFields, NormalizedPostbackStatus } from 'types/Postback/NormalizedPostback';
import type { PostbackQuery, PostbackValidationContext } from 'types/Postback/PostbackValidation';

const querySchema = z.object({
  user: z.string().min(1),
  value: z.string().min(1),
  offerID: z.string().min(1),
  offerName: z.string().min(1),
  userIP: z.string().min(1),
  conversionID: z.string().min(1),
  usdValue: z.string().min(1),
  eventName: z.string().optional(),
  hash: z.string().optional(),
});

type AyetstudiosQuery = z.infer<typeof querySchema>;

export class AyetstudiosPostbackProvider extends PostbackProvider<AyetstudiosQuery> {
  readonly id = 'ayetstudios';
  readonly querySchema = querySchema;

  respond(c: Context, ok: boolean) {
    return c.text(ok ? '1' : '0', 200);
  }

  validateSecurity(ctx: PostbackValidationContext, _data: AyetstudiosQuery, c: Context): boolean {
    const { security } = config.walls.ayetstudios;
    if (isIPWhitelisted(ctx.remoteIP, security.whitelistedIPs)) {
      return true;
    }

    const providedHash =
      c.req.header('x-ayetstudios-security-hash') ?? ctx.query.hash;

    return this.verifyHmac(ctx.query, security.secret, providedHash);
  }

  normalize(data: AyetstudiosQuery): NormalizedPostbackFields {
    let conversionID = data.conversionID;
    let status: NormalizedPostbackStatus = 'completed';
    if (conversionID.startsWith('r-')) {
      conversionID = conversionID.slice(2);
      status = 'reversed';
    }

    return {
      user: data.user,
      value: parseRevenue(data.value),
      usdValue: parseRevenue(data.usdValue),
      offerID: data.offerID,
      offerName: data.offerName,
      conversionID,
      status,
      userIP: data.userIP,
      eventName: data.eventName,
    };
  }

  private phpEncode(value: string): string {
    return encodeURIComponent(value).replace(/%20/g, '+');
  }

  private verifyHmac(
    query: PostbackQuery,
    secret: string | undefined,
    providedHash: string | undefined,
  ): boolean {
    if (!secret || !providedHash) return false;

    const sorted = Object.entries(query)
      .filter(([ key ]) => key !== 'hash')
      .sort(([ a ], [ b ]) => a.localeCompare(b))
      .map(([ key, value ]) => `${key}=${this.phpEncode(value ?? '')}`)
      .join('&');

    const expected = createHmac('sha256', secret).update(sorted).digest('hex');

    return expected === providedHash;
  }
}
