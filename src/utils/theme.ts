export type ColorTheme = 'light' | 'dark';

export const THEME_COOKIE_NAME = 'theme';
const THEME_COOKIE_MAX_AGE_DAYS = 365;

export function isColorTheme(value: unknown): value is ColorTheme {
  return value === 'light' || value === 'dark';
}

export function resolveColorTheme(
  ...candidates: Array<string | undefined | null>
): ColorTheme {
  for (const candidate of candidates) {
    if (isColorTheme(candidate)) return candidate;
  }

  return 'light';
}

export function applyColorTheme(theme: ColorTheme): void {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.theme = theme;
  setThemeCookie(theme);
}

export function clearColorTheme(): void {
  if (typeof document === 'undefined') return;

  delete document.documentElement.dataset.theme;
  setThemeCookie('light');
}

export function setThemeCookie(theme: ColorTheme, days = THEME_COOKIE_MAX_AGE_DAYS): void {
  if (typeof document === 'undefined') return;

  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(theme)}; path=/; expires=${expires}; SameSite=Lax`;
}
