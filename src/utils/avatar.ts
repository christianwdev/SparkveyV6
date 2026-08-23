import { getScope } from '@utils/scope';

export function getUserAvatarUrl(userID: string): string {
  return `${getScope()}/img/avatar/${encodeURIComponent(userID)}`;
}
