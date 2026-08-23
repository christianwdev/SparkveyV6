import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import config from 'backend/config/config';
import { AyetstudiosPostbackProvider } from 'backend/schemas/postback/providers/ayetstudios';
import { ayetstudiosHmac, mockContext, validationContext } from './helpers';

const TEST_SECRET = 'test-ayet-postback-secret';
const TRUSTED_IP = '198.51.100.20';

describe('AyetstudiosPostbackProvider security', () => {
  const provider = new AyetstudiosPostbackProvider();
  let previousSecret: string | undefined;
  let previousIps: string[];

  beforeEach(() => {
    previousSecret = config.walls.ayetstudios.security.secret;
    previousIps = [ ...config.walls.ayetstudios.security.whitelistedIPs ];
    config.walls.ayetstudios.security.secret = TEST_SECRET;
    config.walls.ayetstudios.security.whitelistedIPs = [ TRUSTED_IP ];
  });

  afterEach(() => {
    config.walls.ayetstudios.security.secret = previousSecret;
    config.walls.ayetstudios.security.whitelistedIPs = previousIps;
  });

  const baseQuery = {
    user: 'user_1',
    value: '500',
    offerID: 'offer-9',
    offerName: 'Demo Offer',
    userIP: '203.0.113.5',
    conversionID: 'conv-9',
    usdValue: '0.50',
  };

  test('accepts valid HMAC-SHA256 over sorted query excluding hash', () => {
    const hash = ayetstudiosHmac(baseQuery, TEST_SECRET);

    expect(provider.validateSecurity(
      validationContext({ ...baseQuery, hash }, '203.0.113.99'),
      baseQuery as never,
      mockContext(),
    )).toBe(true);
  });

  test('accepts HMAC from x-ayetstudios-security-hash header', () => {
    const hash = ayetstudiosHmac(baseQuery, TEST_SECRET);

    expect(provider.validateSecurity(
      validationContext(baseQuery, '203.0.113.99'),
      baseQuery as never,
      mockContext({ 'x-ayetstudios-security-hash': hash }),
    )).toBe(true);
  });

  test('allows whitelisted IP without a valid hash', () => {
    expect(provider.validateSecurity(
      validationContext(baseQuery, TRUSTED_IP),
      baseQuery as never,
      mockContext(),
    )).toBe(true);
  });

  test('rejects invalid HMAC when IP is not whitelisted', () => {
    expect(provider.validateSecurity(
      validationContext({ ...baseQuery, hash: 'nope' }, '203.0.113.99'),
      baseQuery as never,
      mockContext(),
    )).toBe(false);
  });

  test('normalize treats r- conversionID prefix as reversed', () => {
    const completed = provider.normalize({
      ...baseQuery,
      conversionID: 'abc123',
    });
    expect(completed.status).toBe('completed');
    expect(completed.conversionID).toBe('abc123');

    const reversed = provider.normalize({
      ...baseQuery,
      conversionID: 'r-abc123',
    });
    expect(reversed.status).toBe('reversed');
    expect(reversed.conversionID).toBe('abc123');
  });
});
