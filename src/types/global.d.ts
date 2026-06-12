export {};

declare global {
  interface Window {
    Verisoul: {
      session: () => Promise<{ session_id?: string }>;
    };
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}