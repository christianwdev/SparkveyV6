import { describe, expect, test } from 'bun:test';
import { normalizeIP, preferIPv4 } from 'backend/utils/ip';

describe('normalizeIP', () => {
  test('unwraps IPv4-mapped IPv6', () => {
    expect(normalizeIP('::ffff:203.0.113.50')).toBe('203.0.113.50');
    expect(normalizeIP('::FFFF:203.0.113.50')).toBe('203.0.113.50');
    expect(normalizeIP('[::ffff:203.0.113.50]')).toBe('203.0.113.50');
  });

  test('leaves ordinary addresses unchanged', () => {
    expect(normalizeIP('203.0.113.50')).toBe('203.0.113.50');
    expect(normalizeIP('2001:db8::1')).toBe('2001:db8::1');
  });
});

describe('preferIPv4', () => {
  test('returns IPv4 when both families are present', () => {
    expect(preferIPv4([ '2001:db8::1', '203.0.113.50' ])).toBe('203.0.113.50');
  });

  test('unwraps a mapped address and prefers it', () => {
    expect(preferIPv4([ '::ffff:203.0.113.50' ])).toBe('203.0.113.50');
  });

  test('falls back to IPv6 when no real IPv4 exists', () => {
    expect(preferIPv4([ '2001:db8::1' ])).toBe('2001:db8::1');
  });

  test('skips Cloudflare Pseudo IPv4 in favor of a real IPv6', () => {
    expect(preferIPv4([ '240.1.2.3', '2001:db8::1' ])).toBe('2001:db8::1');
  });

  test('picks IPv4 from a comma-separated candidate', () => {
    expect(preferIPv4([ '2001:db8::1, 203.0.113.50' ])).toBe('203.0.113.50');
  });

  test('returns undefined when no candidates are usable', () => {
    expect(preferIPv4([ undefined, '', '   ', 'not-an-ip' ])).toBeUndefined();
  });

  test('keeps Pseudo IPv4 when it is the only candidate', () => {
    expect(preferIPv4([ '240.1.2.3' ])).toBe('240.1.2.3');
  });
});
