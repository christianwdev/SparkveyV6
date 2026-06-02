import type {
  PostbackValidationFailureLogFields,
  PostbackValidationIssue,
  PostbackValidationResult,
} from 'types/Postback/PostbackValidation';

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
