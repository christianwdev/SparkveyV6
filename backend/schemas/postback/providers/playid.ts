import { createId } from '@paralleldrive/cuid2';
import { z } from 'zod';

import config from 'backend/config/config';

import type { Context } from 'hono';

import { PostbackProvider } from '../PostbackProvider';
import type { NormalizedPostback, PostbackValidationContext } from '../PostbackProvider';

const querySchema = z.object({
  clickid: z.string().min(1),
  event: z.enum([ 'reg', 'completion' ]),
  secret: z.string().min(1),
});

type PlayidQuery = z.infer<typeof querySchema>;

export class PlayidPostbackProvider extends PostbackProvider<PlayidQuery> {
  readonly id = 'playid';
  readonly querySchema = querySchema;
  respond(c: Context, ok: boolean) {
    if (ok) {
      return c.json({ success: true }, 200);
    }

    return c.json({ success: false }, 400);
  }

  validateSecurity(ctx: PostbackValidationContext): boolean {
    const expected = config.walls.playid.security.secret;

    return Boolean(ctx.query.secret && expected && ctx.query.secret === expected);
  }

  normalize(data: PlayidQuery): NormalizedPostback {
    return {
      clickID: data.clickid,
      value: 0,
      usdValue: 0,
      offerID: '',
      offerName: '',
      conversionID: createId(),
      status: 'completed',
      eventID: data.event,
    };
  }
}
