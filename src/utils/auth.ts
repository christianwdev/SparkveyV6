import { getScope } from '@utils/scope';
import type APIResponse from 'types/APIResponse';
import type SanitizedUser from 'types/User/SanitizedUser';

async function postAuth<T>(
  path: string,
  data: object,
): Promise<APIResponse<T> | null> {
  try {
    const response = await fetch(`${getScope()}/auth${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const payload = await response.json() as APIResponse<T>;

    return payload ?? null;
  } catch {
    return null;
  }
}

export async function requestPasswordReset(body: {
  email: string,
}): Promise<APIResponse<null> | null> {
  return postAuth<null>('/email/forgot-password', body);
}

export async function resetPassword(body: {
  code: string,
  password: string,
}): Promise<APIResponse<null> | null> {
  return postAuth<null>('/email/reset-password', body);
}

export async function confirmEmailChange(body: {
  code: string,
}): Promise<APIResponse<SanitizedUser> | null> {
  return postAuth<SanitizedUser>('/account/email-change', body);
}

export async function confirmAccountDeletion(body: {
  code: string,
}): Promise<APIResponse<null> | null> {
  return postAuth<null>('/account/delete', body);
}
