export const GA4_MEASUREMENT_ID = 'G-LC7WKZ7FBD';

export function setGa4AppLocale(locale: string) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('set', 'user_properties', { app_locale: locale });
}
