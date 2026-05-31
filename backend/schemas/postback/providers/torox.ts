import { z } from 'zod';

import config from 'backend/config/config';
import { parseRevenue } from 'backend/utils/number';
import { isIPWhitelisted } from 'backend/utils/ip';

import type { Context } from 'hono';

import { PostbackProvider } from '../PostbackProvider';
import type { NormalizedPostback, PostbackValidationContext } from '../PostbackProvider';

const querySchema = z.object({
  user: z.string().min(1),
  value: z.string().min(1),
  offerID: z.string().min(1),
  offerName: z.string().min(1),
  conversionID: z.string().min(1),
  usdValue: z.string().min(1),
  offerDisplayName: z.string().optional(),
  userIP: z.string().optional(),
  eventName: z.string().optional(),
  eventID: z.string().optional(),
});

type ToroxQuery = z.infer<typeof querySchema>;

export class ToroxPostbackProvider extends PostbackProvider<ToroxQuery> {
  readonly id = 'torox';
  readonly querySchema = querySchema;
  respond(c: Context, ok: boolean) {
    if (ok) {
      return c.json({ success: true }, 200);
    }

    return c.json({ success: false }, 400);
  }

  validateSecurity(ctx: PostbackValidationContext): boolean {
    return isIPWhitelisted(ctx.remoteIP, config.walls.torox.security.whitelistedIPs);
  }

  normalize(data: ToroxQuery): NormalizedPostback {
    const value = parseRevenue(data.value);

    return {
      user: data.user,
      value,
      usdValue: parseRevenue(data.usdValue),
      offerID: data.offerID,
      offerName: data.offerName,
      conversionID: data.conversionID,
      status: value < 0 ? 'reversed' : 'completed',
      offerDisplayName: data.offerDisplayName,
      userIP: data.userIP,
      eventName: data.eventName,
      eventID: data.eventID,
    };
  }
}
