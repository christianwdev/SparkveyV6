import SiteConfig from 'backend/config/config';

const DEFAULT_BACKEND_URL = 'http://localhost:6060';
const FALLBACK_AVATAR_ORIGIN = 'https://avatars.sparkvey.com';

export function getBackendURL(): string {
  return (SiteConfig.server.backendURL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
}

export function getUserAvatarURL(userID: string): string {
  return `${getBackendURL()}/img/avatar/${encodeURIComponent(userID)}`;
}

export function getFallbackAvatarURL(userID: string): string {
  return `${FALLBACK_AVATAR_ORIGIN}/${encodeURIComponent(userID)}`;
}
