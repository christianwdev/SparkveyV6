'use client';

import { useSyncExternalStore } from 'react';

export type ChartTheme = {
  tooltipBackground: string,
  tooltipText: string,
  tickColor: string,
  gridColor: string,
  accentColor: string,
  accentFill: string,
  accentMuted: string,
};

const FALLBACK_CHART_THEME: ChartTheme = {
  tooltipBackground: '#0A0F16',
  tooltipText: '#FFFFFF',
  tickColor: '#6F7487',
  gridColor: 'rgba(111, 116, 135, 0.25)',
  accentColor: '#9E38D0',
  accentFill: '#9E38D01A',
  accentMuted: '#9E38D0B3',
};

export function useChartTheme(): ChartTheme {
  return useSyncExternalStore(
    subscribeTheme,
    getChartThemeSnapshot,
    () => FALLBACK_CHART_THEME,
  );
}

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [ 'data-theme' ],
  });

  return () => observer.disconnect();
}

function readCssVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function withAlpha(color: string, alphaHex: string): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return `${color}${alphaHex}`;

  return color;
}

function readChartTheme(): ChartTheme {
  const accentColor = readCssVar('--accentColor', FALLBACK_CHART_THEME.accentColor);

  return {
    tooltipBackground: readCssVar('--backgroundColorDarkAlways', FALLBACK_CHART_THEME.tooltipBackground),
    tooltipText: readCssVar('--textColorDarkAlways', FALLBACK_CHART_THEME.tooltipText),
    tickColor: readCssVar('--text-light', FALLBACK_CHART_THEME.tickColor),
    gridColor: readCssVar('--border-light', FALLBACK_CHART_THEME.gridColor),
    accentColor,
    accentFill: withAlpha(accentColor, '1A'),
    accentMuted: withAlpha(accentColor, 'B3'),
  };
}

let cachedThemeJson = '';
let cachedTheme: ChartTheme = FALLBACK_CHART_THEME;

function getChartThemeSnapshot(): ChartTheme {
  const next = readChartTheme();
  const json = JSON.stringify(next);
  if (json === cachedThemeJson) return cachedTheme;
  cachedThemeJson = json;
  cachedTheme = next;

  return cachedTheme;
}
