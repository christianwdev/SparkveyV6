/**
 * Parses a numeric string in any common international format into a JS number.
 * Returns the raw parsed float — apply truncateCents or roundCents separately.
 *
 * Detection rules:
 *   - Mixed separators (e.g. "1,234.56" or "1.234,56"): the last separator is the decimal point.
 *   - Single separator with exactly 3 trailing digits (e.g. "1,234" or "1.234"): treated as a
 *     thousands separator → integer result.
 *   - Single separator with any other digit count: treated as the decimal point.
 *   - Multiple identical separators: validated as thousands (each group after the first must be
 *     exactly 3 digits). Invalid groupings like "1.2.3" or "1,2,3" return 0.
 *   - A leading minus sign is preserved; a minus sign anywhere else causes rejection.
 *   - Currency symbols and whitespace are stripped.
 *
 * Examples:
 *   "1234.56"    → 1234.56
 *   "1,234.56"   → 1234.56
 *   "1.234,56"   → 1234.56
 *   "1234,56"    → 1234.56
 *   "1.234"      → 1234     (3 trailing digits → thousands separator)
 *   "1,234"      → 1234     (3 trailing digits → thousands separator)
 *   "-1,234.56"  → -1234.56
 *   "$1,50"      → 1.5
 *   "1.5EUR"     → 1.5
 *   "1.2.3"      → 0        (invalid grouping)
 *   "12-34"      → 0        (mid-string minus)
 */
export function parseRevenue(value: string | number): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const trimmed = value.trim();
  if (!trimmed) return 0;

  // Capture a leading sign before any stripping.
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;

  // Any minus sign after the leading position is invalid.
  if (unsigned.includes('-')) return 0;

  // Strip currency symbols and anything that isn't a digit, comma, or dot.
  const cleaned = unsigned.replace(/[^\d,.]/g, '');

  if (!cleaned) return 0;

  const dotCount   = (cleaned.match(/\./g) ?? []).length;
  const commaCount = (cleaned.match(/,/g) ?? []).length;
  const lastDot    = cleaned.lastIndexOf('.');
  const lastComma  = cleaned.lastIndexOf(',');

  let normalized: string;

  if (dotCount > 0 && commaCount > 0) {
    // Mixed separators → last one is the decimal point.
    if (lastDot > lastComma) {
      if (!hasValidThousandsGrouping(cleaned.slice(0, lastDot), ',')) return 0;
      normalized = cleaned.replace(/,/g, '');
    } else {
      if (!hasValidThousandsGrouping(cleaned.slice(0, lastComma), '.')) return 0;
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else if (dotCount > 1) {
    if (!hasValidThousandsGrouping(cleaned, '.')) return 0;
    normalized = cleaned.replace(/\./g, '');
  } else if (commaCount > 1) {
    if (!hasValidThousandsGrouping(cleaned, ',')) return 0;
    normalized = cleaned.replace(/,/g, '');
  } else if (dotCount === 1) {
    const afterDot = cleaned.slice(lastDot + 1);
    normalized = afterDot.length === 3 ? cleaned.replace('.', '') : cleaned;
  } else if (commaCount === 1) {
    const afterComma = cleaned.slice(lastComma + 1);
    normalized = afterComma.length === 3
      ? cleaned.replace(',', '')
      : cleaned.replace(',', '.');
  } else {
    normalized = cleaned;
  }

  const result = parseFloat(normalized);
  if (!Number.isFinite(result)) return 0;

  return negative ? -result : result;
}

/**
 * Truncates to 2 decimal places towards zero.
 * Safe for negatives: truncateCents(-1.231) → -1.23
 */
export function truncateCents(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.trunc(value * 100) / 100;
}

/**
 * Rounds to 2 decimal places, half away from zero.
 *   roundCents(1.235)  → 1.24
 *   roundCents(-1.235) → -1.24  (Math.round alone would give -1.23)
 *
 * Number.EPSILON corrects float representation drift where e.g.
 * 1.005 * 100 = 100.49999... instead of 100.5, causing Math.round to floor.
 */
export function roundCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;

  return sign * Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100;
}

/**
 * Returns true when all digit groups separated by `sep` are valid for a
 * thousands-separator role: the first group has 1–3 digits, every subsequent
 * group has exactly 3 digits.
 */
export function hasValidThousandsGrouping(str: string, sep: string): boolean {
  const parts = str.split(sep);

  return parts.every((part, i) =>
    i === 0 ? /^\d{1,3}$/.test(part) : /^\d{3}$/.test(part)
  );
}
