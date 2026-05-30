import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: [ 'en', 'es', 'de', 'ko', 'ja', 'pt', 'pl', 'fr', 'it' ],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export const LOCALES = routing.locales;
export const DEFAULT_LOCALE = routing.defaultLocale;

export type AppLocale = (typeof LOCALES)[number];

export function isSupportedLocale(locale: string): locale is AppLocale {
  return LOCALES.includes(locale as AppLocale);
}
