import { z } from 'zod';

import config from 'backend/config/config';
import { parseRevenue } from 'backend/utils/number';
import { isIPWhitelisted } from 'backend/utils/ip';

import type { Context } from 'hono';

import { PostbackProvider } from '../PostbackProvider';
import type { NormalizedPostbackFields, NormalizedPostbackStatus } from 'types/Postback/NormalizedPostback';
import type { PostbackValidationContext } from 'types/Postback/PostbackValidation';

const querySchema = z.object({
  userID: z.string().min(1),
  conversionID: z.string().min(1),
  offerID: z.string().min(1),
  offerName: z.string().min(1),
  usdValue: z.string().min(1),
  reward: z.string().min(1),
  status: z.string().min(1),
  offerDisplayName: z.string().optional(),
  userIP: z.string().optional(),
  eventName: z.string().optional(),
  eventID: z.string().optional(),
});

type GemiadsQuery = z.infer<typeof querySchema>;

export class GemiadsPostbackProvider extends PostbackProvider<GemiadsQuery> {
  readonly id = 'gemiads';
  readonly querySchema = querySchema;

  respond(c: Context, ok: boolean) {
    return c.text(ok ? '1' : '0', 200);
  }

  validateSecurity(ctx: PostbackValidationContext): boolean {
    return isIPWhitelisted(ctx.remoteIP, config.walls.gemiads.security.whitelistedIPs);
  }

  normalize(data: GemiadsQuery): NormalizedPostbackFields {
    const statusRaw = data.status.trim().toLowerCase();
    let status: NormalizedPostbackStatus = 'completed';
    if (statusRaw === 'rejected' || statusRaw === 'reversed') status = 'reversed';
    else if (statusRaw === 'pending') status = 'held';

    return {
      user: data.userID,
      value: parseRevenue(data.reward),
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
