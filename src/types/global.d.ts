export {};

declare global {
  interface Window {
    Verisoul: {
      session: () => Promise<{ session_id?: string }>;
    };
  }
}