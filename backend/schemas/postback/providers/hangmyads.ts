import { z } from 'zod';

import config from 'backend/config/config';
import { parseRevenue } from 'backend/utils/number';

import type { Context } from 'hono';

import { PostbackProvider } from '../PostbackProvider';
import type { NormalizedPostback, PostbackValidationContext } from '../PostbackProvider';

const querySchema = z.object({
  secret: z.string().min(1),
  user: z.string().min(1),
  offerID: z.string().min(1),
  offerName: z.string().min(1),
  conversionID: z.string().min(1),
  usdValue: z.string().min(1),
  offerDisplayName: z.string().optional(),
  userIP: z.string().optional(),
  eventName: z.string().optional(),
  eventID: z.string().optional(),
});

type HangmyadsQuery = z.infer<typeof querySchema>;

export class HangmyadsPostbackProvider extends PostbackProvider<HangmyadsQuery> {
  readonly id = 'hangmyads';
  readonly querySchema = querySchema;
  respond(c: Context, ok: boolean) {
    if (ok) {
      return c.json({ success: true }, 200);
    }

    return c.json({ success: false }, 400);
  }

  validateSecurity(ctx: PostbackValidationContext): boolean {
    const expected = config.walls.hangmyads.security.secret;

    return Boolean(ctx.query.secret && expected && ctx.query.secret === expected);
  }

  normalize(data: HangmyadsQuery): NormalizedPostback {
    const usdValue = parseRevenue(data.usdValue) / 100;
    const rate = config.walls.hangmyads.rate || 0.75;

    return {
      user: data.user,
      value: Math.floor(usdValue * 1000 * rate),
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
