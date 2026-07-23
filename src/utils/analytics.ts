export const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? '';

export function setGa4AppLocale(locale: string) {
  if (!GA4_MEASUREMENT_ID) return;
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('set', 'user_properties', { app_locale: locale });
}
