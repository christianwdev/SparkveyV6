import config from 'backend/config/config';

const DEFAULT_FRONTEND_URL = 'http://localhost:3000';
const DEFAULT_BACKEND_URL = 'http://localhost:6060';
const PRODUCTION_BACKEND_URL = 'https://api.sparkvey.com';
const FALLBACK_AVATAR_ORIGIN = 'https://avatars.sparkvey.com';

export function getFrontendURL() {
  return config.server.frontendURL ?? DEFAULT_FRONTEND_URL;
}

export function getBackendURL(): string {
  const fallback = process.env.NODE_ENV === 'development'
    ? DEFAULT_BACKEND_URL
    : PRODUCTION_BACKEND_URL;

  return (config.server.backendURL || fallback).replace(/\/$/, '');
}

export function buildFrontendURL(
  path: string,
  searchParams?: Record<string, string | number | boolean | undefined>,
) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(normalizedPath, getFrontendURL());

  if (searchParams) {
    for (const [ key, value ] of Object.entries(searchParams)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

export function getUserAvatarURL(userID: string): string {
  return `${getBackendURL()}/img/avatar/${encodeURIComponent(userID)}`;
}

export function getFallbackAvatarURL(userID: string): string {
  return `${FALLBACK_AVATAR_ORIGIN}/${encodeURIComponent(userID)}`;
}
