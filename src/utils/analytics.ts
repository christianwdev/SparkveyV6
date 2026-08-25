import { canUseDom } from '@utils/dom';

export const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? '';

export function setGa4AppLocale(locale: string) {
  if (!GA4_MEASUREMENT_ID) return;

  const gtag = canUseDom() ? window.gtag : undefined;
  if (!(gtag instanceof Function)) return;

  gtag('set', 'user_properties', { app_locale: locale });
}
