import en from '../../src/messages/en.json';
import es from '../../src/messages/es.json';

export const copy = {
  en,
  es,
} as const;

export const DEFAULT_LOCALE = 'en';

export function localePath(path: string, locale = DEFAULT_LOCALE): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;

  if (normalized === '/') {
    return `/${locale}`;
  }

  return `/${locale}${normalized}`;
}

export function hasE2ECredentials(): boolean {
  return Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
}
