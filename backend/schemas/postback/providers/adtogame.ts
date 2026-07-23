import { z } from 'zod';

import config from 'backend/config/config';
import { parseRevenue } from 'backend/utils/number';
import { secretsEqual } from 'backend/utils/secrets';

import type { Context } from 'hono';

import { PostbackProvider } from '../PostbackProvider';
import type { NormalizedPostbackFields } from 'types/Postback/NormalizedPostback';
import type { PostbackValidationContext } from 'types/Postback/PostbackValidation';

const querySchema = z.object({
  offerID: z.string().min(1),
  offerName: z.string().min(1),
  conversionID: z.string().min(1),
  usdValue: z.string().min(1),
  secret: z.string().min(1),
  userID: z.string().optional(),
  sub2: z.string().optional(),
  offerDisplayName: z.string().optional(),
  userIP: z.string().optional(),
  eventName: z.string().optional(),
  eventID: z.string().optional(),
  currency: z.string().optional(),
}).refine(
  query => Boolean(query.userID || query.sub2),
  { message: 'userID or sub2 is required' },
);

type AdtogameQuery = z.infer<typeof querySchema>;

export class AdtogamePostbackProvider extends PostbackProvider<AdtogameQuery> {
  readonly id = 'adtowall';
  readonly aliases = [ 'adtogame' ] as const;
  readonly querySchema = querySchema;
  respond(c: Context, ok: boolean) {
    if (ok) {
      return c.json({ success: true }, 200);
    }

    return c.json({ success: false }, 400);
  }

  validateSecurity(ctx: PostbackValidationContext, _data: AdtogameQuery, _c: Context): boolean {
    return secretsEqual(ctx.query.secret, config.walls.adtowall.security.secret);
  }

  normalize(data: AdtogameQuery): NormalizedPostbackFields {
    const currencyRate = data.currency
      ? (config.walls.adtowall.currencyRates[data.currency] ?? 1)
      : 1;
    const usdValue = parseRevenue(data.usdValue) / currencyRate;

    return {
      user: data.userID ?? data.sub2,
      value: Math.floor(usdValue * 1000 * 0.75),
      usdValue,
      offerID: data.offerID,
      offerName: data.offerName,
      conversionID: data.conversionID,
      status: 'completed',
      offerDisplayName: data.offerDisplayName,
      userIP: data.userIP,
      eventName: data.eventName,
      eventID: data.eventID,
    };
  }
}
