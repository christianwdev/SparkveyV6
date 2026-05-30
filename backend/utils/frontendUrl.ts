import config from 'backend/config/config';

const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

export function getFrontendURL() {
  return config.server.frontendURL ?? DEFAULT_FRONTEND_URL;
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
