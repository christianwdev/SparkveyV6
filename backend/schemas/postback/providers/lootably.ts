import { createHash } from 'crypto';
import { z } from 'zod';

import config from 'backend/config/config';
import { parseRevenue } from 'backend/utils/number';

import type { Context } from 'hono';

import { PostbackProvider } from '../PostbackProvider';
import type { NormalizedPostbackFields } from 'types/Postback/NormalizedPostback';
import type { PostbackValidationContext } from 'types/Postback/PostbackValidation';

const querySchema = z.object({
  user: z.string().min(1),
  value: z.string().min(1),
  offerID: z.string().min(1),
  offerName: z.string().min(1),
  conversionID: z.string().min(1),
  usdValue: z.string().min(1),
  status: z.string().min(1),
  offerDisplayName: z.string().optional(),
  userIP: z.string().optional(),
  eventName: z.string().optional(),
  eventID: z.string().optional(),
  hash: z.string().optional(),
});

type LootablyQuery = z.infer<typeof querySchema>;

export class LootablyPostbackProvider extends PostbackProvider<LootablyQuery> {
  readonly id = 'lootably';
  readonly querySchema = querySchema;

  respond(c: Context, ok: boolean) {
    return c.text(ok ? '1' : '0', 200);
  }

  validateSecurity(ctx: PostbackValidationContext): boolean {
    const secret = config.walls.lootably.security.secret;
    if (!secret || !ctx.query.hash) return false;

    const payload =
      (ctx.query.user ?? '') +
      (ctx.query.userIP ?? '') +
      (ctx.query.usdValue ?? '') +
      (ctx.query.value ?? '') +
      secret;

    const expected = createHash('sha256').update(payload).digest('hex');

    return expected === ctx.query.hash;
  }

  normalize(data: LootablyQuery): NormalizedPostbackFields {
    return {
      user: data.user,
      value: parseRevenue(data.value),
      usdValue: parseRevenue(data.usdValue),
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
