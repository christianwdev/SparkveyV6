import { z } from 'zod';

import config from 'backend/config/config';
import { parseRevenue } from 'backend/utils/number';
import { isIPWhitelisted } from 'backend/utils/ip';

import type { Context } from 'hono';

import { PostbackProvider } from '../PostbackProvider';
import type { NormalizedPostback, NormalizedPostbackStatus, PostbackValidationContext } from '../PostbackProvider';

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
});

type AdscendQuery = z.infer<typeof querySchema>;

export class AdscendPostbackProvider extends PostbackProvider<AdscendQuery> {
  readonly id = 'adscend';
  readonly querySchema = querySchema;
  respond(c: Context, ok: boolean) {
    if (ok) {
      return c.json({ success: true }, 200);
    }

    return c.json({ success: false }, 400);
  }

  validateSecurity(ctx: PostbackValidationContext): boolean {
    return isIPWhitelisted(ctx.remoteIP, config.walls.adscend.security.whitelistedIPs);
  }

  normalize(data: AdscendQuery): NormalizedPostback {
    let status: NormalizedPostbackStatus = 'completed';

    if (data.status === '3' || data.status === '2') {
      status = 'reversed';
    }

    return {
      user: data.user,
      value: parseRevenue(data.value),
      usdValue: parseRevenue(data.usdValue),
      offerID: data.offerID,
      offerName: data.offerName,
      conversionID: data.conversionID,
      status,
      offerDisplayName: data.offerDisplayName,
      userIP: data.userIP,
      eventName: data.eventName,
      eventID: data.eventID,
    };
  }
}
