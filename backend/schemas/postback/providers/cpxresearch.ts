import { z } from 'zod';

import { isIPWhitelisted } from 'backend/utils/ip';
import { parseRevenue } from 'backend/utils/number';

import type { Context } from 'hono';

import { PostbackProvider } from '../PostbackProvider';
import type { NormalizedPostbackFields } from 'types/Postback/NormalizedPostback';
import type { PostbackValidationContext } from 'types/Postback/PostbackValidation';

const CPXRESEARCH_WHITELIST = [
  '188.40.3.73',
  '157.90.97.92',
  '2a01:4f8:d0a:30ff::/64',
] as const;

const querySchema = z.object({
  user: z.string().min(1),
  value: z.string().min(1),
  conversionID: z.string().min(1),
  usdValue: z.string().min(1),
  offerID: z.string().optional(),
  offerName: z.string().optional(),
  offerDisplayName: z.string().optional(),
  userIP: z.string().optional(),
  eventName: z.string().optional(),
  eventID: z.string().optional(),
  status: z.string().optional(),
});

type CpxresearchQuery = z.infer<typeof querySchema>;

export class CpxresearchPostbackProvider extends PostbackProvider<CpxresearchQuery> {
  readonly id = 'cpxresearch';
  readonly querySchema = querySchema;
  respond(c: Context, ok: boolean) {
    if (ok) {
      return c.json({ success: true }, 200);
    }

    return c.json({ success: false }, 400);
  }

  validateSecurity(ctx: PostbackValidationContext, _data: CpxresearchQuery, _c: Context): boolean {
    return isIPWhitelisted(ctx.remoteIP, CPXRESEARCH_WHITELIST);
  }

  normalize(data: CpxresearchQuery): NormalizedPostbackFields {
    return {
      user: data.user,
      value: parseRevenue(data.value),
      usdValue: parseRevenue(data.usdValue),
      offerID: data.offerID ?? 'cpxresearch',
      offerName: data.offerName ?? 'CPX Research',
      conversionID: data.conversionID,
      status: data.status === '2' ? 'reversed' : 'completed',
      offerDisplayName: data.offerDisplayName,
      userIP: data.userIP,
      eventName: data.eventName,
      eventID: data.eventID,
    };
  }
}
