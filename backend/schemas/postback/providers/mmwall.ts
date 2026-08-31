import { z } from 'zod';

import { isIPWhitelisted } from 'backend/utils/ip';
import { parseRevenue } from 'backend/utils/number';

import type { Context } from 'hono';

import { PostbackProvider } from '../PostbackProvider';
import type { NormalizedPostbackFields } from 'types/Postback/NormalizedPostback';
import type { PostbackValidationContext } from 'types/Postback/PostbackValidation';

// Documented MM Wall postback source: https://make-money.gitbook.io/integration/overview/postbacks
const MMWALL_WHITELIST = [ '63.32.127.99' ] as const;

const querySchema = z.object({
  user: z.string().min(1).optional(),
  user_id: z.string().min(1).optional(),
  value: z.string().min(1).optional(),
  amount: z.string().min(1).optional(),
  usdValue: z.string().min(1).optional(),
  payout: z.string().min(1).optional(),
  offerID: z.string().min(1).optional(),
  offerid: z.string().min(1).optional(),
  offerName: z.string().min(1).optional(),
  offername: z.string().min(1).optional(),
  conversionID: z.string().min(1).optional(),
  transaction_id: z.string().min(1).optional(),
  status: z.string().optional(),
  offerDisplayName: z.string().optional(),
  userIP: z.string().optional(),
  user_ip: z.string().optional(),
  eventName: z.string().optional(),
  eventID: z.string().optional(),
}).refine(data => Boolean(data.user || data.user_id), {
  message: 'Required',
  path: [ 'user' ],
}).refine(data => Boolean(data.value || data.amount), {
  message: 'Required',
  path: [ 'value' ],
}).refine(data => Boolean(data.usdValue || data.payout), {
  message: 'Required',
  path: [ 'usdValue' ],
}).refine(data => Boolean(data.offerID || data.offerid), {
  message: 'Required',
  path: [ 'offerID' ],
}).refine(data => Boolean(data.offerName || data.offername), {
  message: 'Required',
  path: [ 'offerName' ],
}).refine(data => Boolean(data.conversionID || data.transaction_id), {
  message: 'Required',
  path: [ 'conversionID' ],
});

type MmwallQuery = z.infer<typeof querySchema>;

export class MmwallPostbackProvider extends PostbackProvider<MmwallQuery> {
  readonly id = 'mmwall';
  readonly querySchema = querySchema;

  respond(c: Context, ok: boolean) {
    return c.text(ok ? '1' : '0', ok ? 200 : 400);
  }

  validateSecurity(ctx: PostbackValidationContext, _data: MmwallQuery, _c: Context): boolean {
    return isIPWhitelisted(ctx.remoteIP, [ ...MMWALL_WHITELIST ]);
  }

  normalize(data: MmwallQuery): NormalizedPostbackFields {
    const statusRaw = (data.status ?? '1').trim().toLowerCase();
    const status = statusRaw === '0'
      || statusRaw === '2'
      || statusRaw === 'chargeback'
      || statusRaw === 'reversed'
      ? 'reversed'
      : 'completed';

    return {
      user: data.user ?? data.user_id,
      value: parseRevenue(data.value ?? data.amount ?? '0'),
      usdValue: parseRevenue(data.usdValue ?? data.payout ?? '0'),
      offerID: data.offerID ?? data.offerid ?? '',
      offerName: data.offerName ?? data.offername ?? 'MM Wall',
      conversionID: data.conversionID ?? data.transaction_id ?? '',
      status,
      offerDisplayName: data.offerDisplayName,
      userIP: data.userIP ?? data.user_ip,
      eventName: data.eventName,
      eventID: data.eventID,
    };
  }
}
