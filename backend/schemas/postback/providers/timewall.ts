import { z } from 'zod';

import config from 'backend/config/config';
import { parseRevenue } from 'backend/utils/number';
import { isIPWhitelisted } from 'backend/utils/ip';

import type { Context } from 'hono';

import { PostbackProvider } from '../PostbackProvider';
import type { NormalizedPostbackFields } from 'types/Postback/NormalizedPostback';
import type { PostbackValidationContext } from 'types/Postback/PostbackValidation';

const querySchema = z.object({
  user: z.string().min(1),
  value: z.string().min(1),
  conversionID: z.string().min(1),
  usdValue: z.string().min(1),
  offerDisplayName: z.string().optional(),
  userIP: z.string().optional(),
  eventName: z.string().optional(),
  eventID: z.string().optional(),
});

type TimewallQuery = z.infer<typeof querySchema>;

export class TimewallPostbackProvider extends PostbackProvider<TimewallQuery> {
  readonly id = 'timewall';
  readonly querySchema = querySchema;
  respond(c: Context, ok: boolean) {
    if (ok) {
      return c.json({ success: true }, 200);
    }

    return c.json({ success: false }, 400);
  }

  validateSecurity(ctx: PostbackValidationContext): boolean {
    return isIPWhitelisted(ctx.remoteIP, config.walls.timewall.security.whitelistedIPs);
  }

  normalize(data: TimewallQuery): NormalizedPostbackFields {
    const value = parseRevenue(data.value);

    return {
      user: data.user,
      value,
      usdValue: parseRevenue(data.usdValue),
      offerID: 'timewall',
      offerName: 'TimeWall',
      conversionID: data.conversionID,
      status: value < 0 ? 'reversed' : 'completed',
      offerDisplayName: data.offerDisplayName,
      userIP: data.userIP,
      eventName: data.eventName,
      eventID: data.eventID,
    };
  }
}
