import type { z } from 'zod';
import type { Context } from 'hono';

import SiteConfig from '../../config/config';

import type { NormalizedPostbackFields } from 'types/Postback/NormalizedPostback';
import type {
  PostbackValidationContext,
  PostbackValidationFailure,
  PostbackValidationResult,
  PostbackValidationSuccess,
} from 'types/Postback/PostbackValidation';

export abstract class PostbackProvider<TQuery extends Record<string, unknown> = Record<string, unknown>> {
  abstract readonly id: string;
  readonly aliases: readonly string[] = [];
  abstract readonly querySchema: z.ZodType<TQuery>;

  abstract validateSecurity(
    ctx: PostbackValidationContext,
    data: TQuery,
    c: Context,
  ): boolean | Promise<boolean>;

  abstract normalize(data: TQuery, ctx: PostbackValidationContext): NormalizedPostbackFields;

  abstract respond(c: Context, ok: boolean): Response | Promise<Response>;

  validate(ctx: PostbackValidationContext, c: Context): PostbackValidationResult<TQuery> {
    const parsed = this.querySchema.safeParse(ctx.query);
    if (!parsed.success) {
      const failure: PostbackValidationFailure = {
        ok: false,
        reason: 'invalid_params',
        issues: parsed.error.issues.map(issue => ({
          path: issue.path.length > 0 ? issue.path.join('.') : '(root)',
          message: issue.message,
        })),
      };

      return failure;
    }

    if (!SiteConfig.postback.disableSecurityChecks && !this.validateSecurity(ctx, parsed.data, c)) {
      const failure: PostbackValidationFailure = { ok: false, reason: 'security_failed' };

      return failure;
    }

    const success: PostbackValidationSuccess<TQuery> = {
      ok: true,
      data: parsed.data,
      normalized: {
        ...this.normalize(parsed.data, ctx),
        provider: this.id,
      },
    };

    return success;
  }
}
