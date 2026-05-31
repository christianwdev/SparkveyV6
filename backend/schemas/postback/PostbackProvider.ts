import type { z } from 'zod';
import type { Context } from 'hono';

import SiteConfig from '../../config/config';

export type PostbackQuery = Record<string, string | undefined>;

export type PostbackValidationContext = {
  query: PostbackQuery;
  remoteIP: string | undefined;
};

export type NormalizedPostbackStatus = 'completed' | 'held' | 'reversed';

export type NormalizedPostback = {
  user?: string;
  clickID?: string;
  value: number;
  usdValue: number;
  offerID: string;
  offerName: string;
  conversionID: string;
  status: NormalizedPostbackStatus;
  offerDisplayName?: string;
  userIP?: string;
  eventName?: string;
  eventID?: string;
};

export type PostbackValidationIssue = {
  path: string;
  message: string;
};

export type PostbackValidationSuccess<T> = {
  readonly ok: true;
  data: T;
  normalized: NormalizedPostback;
};

export type PostbackValidationFailure = {
  readonly ok: false;
  reason: 'invalid_params' | 'security_failed';
  issues?: PostbackValidationIssue[];
};

export type PostbackValidationResult<T> = PostbackValidationSuccess<T> | PostbackValidationFailure;

export type PostbackValidationFailureLogFields = {
  failureReason: PostbackValidationFailure['reason'];
  failureDetail: string;
  validationIssues?: PostbackValidationIssue[];
};

function formatValidationIssues(issues: PostbackValidationIssue[] | undefined): string | undefined {
  if (!issues?.length) return undefined;

  return issues.map(issue => `${issue.path}: ${issue.message}`).join('; ');
}

export function validationFailureToLogFields(
  result: PostbackValidationResult<unknown>,
): PostbackValidationFailureLogFields {
  if (!('reason' in result)) {
    throw new Error('validationFailureToLogFields requires a failed validation result');
  }

  const failure = result;

  if (failure.reason === 'security_failed') {
    return {
      failureReason: 'security_failed',
      failureDetail: 'Security validation failed (IP whitelist, secret, or signature).',
    };
  }

  return {
    failureReason: 'invalid_params',
    failureDetail: formatValidationIssues(failure.issues) ?? 'Query parameters failed schema validation.',
    validationIssues: failure.issues,
  };
}

export abstract class PostbackProvider<TQuery extends Record<string, unknown> = Record<string, unknown>> {
  abstract readonly id: string;
  readonly aliases: readonly string[] = [];
  abstract readonly querySchema: z.ZodType<TQuery>;

  abstract validateSecurity(
    ctx: PostbackValidationContext,
    data: TQuery,
    c: Context,
  ): boolean | Promise<boolean>;

  abstract normalize(data: TQuery, ctx: PostbackValidationContext): NormalizedPostback;

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
      normalized: this.normalize(parsed.data, ctx),
    };

    return success;
  }
}
