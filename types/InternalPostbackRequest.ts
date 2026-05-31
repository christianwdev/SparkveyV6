import type { NormalizedPostback } from 'backend/schemas/postback/PostbackProvider';

export type PostbackLogFailureReason =
  | 'unknown_provider'
  | 'invalid_params'
  | 'security_failed'
  | 'internal_error';

export type PostbackLogValidationIssue = {
  path: string;
  message: string;
};

type InternalPostbackRequest = {
  date: Date;
  originalURL: string;
  provider: string;
  query: Record<string, string | undefined>;
  remoteIP: string | null;
  requestID: string;
  status: 'pending' | 'completed' | 'failed';
  resolvedProviderId?: string;
  failureReason?: PostbackLogFailureReason;
  failureDetail?: string;
  validationIssues?: PostbackLogValidationIssue[];
  normalized?: NormalizedPostback;
  completedAt?: Date;

  /** Set when POSTBACK_DISABLE_SECURITY bypass was active for this request */
  securityChecksSkipped?: boolean;
};

export default InternalPostbackRequest;
