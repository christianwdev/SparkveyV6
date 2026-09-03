import { describe, expect, test } from 'bun:test';
import { parseRevenue } from 'backend/utils/number';

describe('parseRevenue', () => {
  test('treats a lone dot as a decimal, including mill-precision USD', () => {
    expect(parseRevenue('0.889')).toBe(0.889);
    expect(parseRevenue('1.085')).toBe(1.085);
    expect(parseRevenue('-1.085')).toBe(-1.085);
    expect(parseRevenue('1234.56')).toBe(1234.56);
    expect(parseRevenue('1.234')).toBe(1.234);
  });

  test('parses the Lootably usdValue that used to become $889', () => {
    expect(parseRevenue('0.889')).toBe(0.889);
    expect(parseRevenue('666')).toBe(666);
  });

  test('treats a lone comma with three digits as thousands unless the integer is zero', () => {
    expect(parseRevenue('1,234')).toBe(1234);
    expect(parseRevenue('12,345')).toBe(12345);
    expect(parseRevenue('0,889')).toBe(0.889);
    expect(parseRevenue('1234,56')).toBe(1234.56);
    expect(parseRevenue('$1,50')).toBe(1.5);
  });

  test('handles mixed separators and currency suffixes', () => {
    expect(parseRevenue('1,234.56')).toBe(1234.56);
    expect(parseRevenue('1.234,56')).toBe(1234.56);
    expect(parseRevenue('-1,234.56')).toBe(-1234.56);
    expect(parseRevenue('1.5EUR')).toBe(1.5);
  });

  test('rejects invalid groupings and mid-string minus', () => {
    expect(parseRevenue('1.2.3')).toBe(0);
    expect(parseRevenue('1,2,3')).toBe(0);
    expect(parseRevenue('12-34')).toBe(0);
  });
});
