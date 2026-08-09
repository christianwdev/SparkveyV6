import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ locale, requestLocale }) => {
  // Prefer an explicit override (e.g. getTranslations({ locale })) so cached
  // metadata never touches request-time requestLocale / headers.
  let resolved = locale;

  if (!resolved) {
    const requested = await requestLocale;
    resolved = hasLocale(routing.locales, requested)
      ? requested
      : routing.defaultLocale;
  } else if (!hasLocale(routing.locales, resolved)) {
    resolved = routing.defaultLocale;
  }

  const messages = await import(`../messages/${resolved}.json`);

  return {
    locale: resolved,
    messages: messages.default,
  };
});
