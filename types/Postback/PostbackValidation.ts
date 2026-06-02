import type { NormalizedPostback } from './NormalizedPostback';

export type PostbackQuery = Record<string, string | undefined>;

export type PostbackValidationContext = {
  query: PostbackQuery;
  remoteIP: string | undefined;
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
