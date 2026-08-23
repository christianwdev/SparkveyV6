import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import config from 'backend/config/config';
import { AdscendPostbackProvider } from 'backend/schemas/postback/providers/adscend';
import { CpxresearchPostbackProvider } from 'backend/schemas/postback/providers/cpxresearch';
import { GemiadsPostbackProvider } from 'backend/schemas/postback/providers/gemiads';
import { TimewallPostbackProvider } from 'backend/schemas/postback/providers/timewall';
import { ToroxPostbackProvider } from 'backend/schemas/postback/providers/torox';
import { WaxrewardsPostbackProvider } from 'backend/schemas/postback/providers/waxrewards';
import { mockContext, validationContext } from './helpers';

type WallKey = 'waxrewards' | 'torox' | 'timewall' | 'gemiads' | 'adscend';

function withWhitelist(wall: WallKey, ips: string[], run: () => void) {
  const previous = [ ...config.walls[wall].security.whitelistedIPs ];
  config.walls[wall].security.whitelistedIPs = ips;
  try {
    run();
  } finally {
    config.walls[wall].security.whitelistedIPs = previous;
  }
}

describe('IP-whitelist postback providers', () => {
  const cases: {
    name: string,
    wall: WallKey,
    provider: { validateSecurity: (ctx: ReturnType<typeof validationContext>, data: never, c: ReturnType<typeof mockContext>) => boolean },
  }[] = [
    { name: 'waxrewards', wall: 'waxrewards', provider: new WaxrewardsPostbackProvider() },
    { name: 'torox', wall: 'torox', provider: new ToroxPostbackProvider() },
    { name: 'timewall', wall: 'timewall', provider: new TimewallPostbackProvider() },
    { name: 'gemiads', wall: 'gemiads', provider: new GemiadsPostbackProvider() },
    { name: 'adscend', wall: 'adscend', provider: new AdscendPostbackProvider() },
  ];

  for (const { name, wall, provider } of cases) {
    test(`${name}: allows whitelisted IP and rejects others / empty list`, () => {
      withWhitelist(wall, [ '203.0.113.50' ], () => {
        expect(provider.validateSecurity(
          validationContext({}, '203.0.113.50'),
          {} as never,
          mockContext(),
        )).toBe(true);

        expect(provider.validateSecurity(
          validationContext({}, '198.51.100.1'),
          {} as never,
          mockContext(),
        )).toBe(false);
      });

      withWhitelist(wall, [], () => {
        expect(provider.validateSecurity(
          validationContext({}, '203.0.113.50'),
          {} as never,
          mockContext(),
        )).toBe(false);
      });
    });
  }

  describe('CpxresearchPostbackProvider (hardcoded whitelist)', () => {
    const provider = new CpxresearchPostbackProvider();

    test('allows documented CPX IPs and matching IPv6 /64', () => {
      expect(provider.validateSecurity(
        validationContext({}, '188.40.3.73'),
        {} as never,
        mockContext(),
      )).toBe(true);

      expect(provider.validateSecurity(
        validationContext({}, '157.90.97.92'),
        {} as never,
        mockContext(),
      )).toBe(true);

      expect(provider.validateSecurity(
        validationContext({}, '2a01:4f8:d0a:30ff:1:2:3:4'),
        {} as never,
        mockContext(),
      )).toBe(true);
    });

    test('rejects non-whitelisted IP', () => {
      expect(provider.validateSecurity(
        validationContext({}, '203.0.113.1'),
        {} as never,
        mockContext(),
      )).toBe(false);
    });
  });
});

describe('IP whitelist edge cases via waxrewards', () => {
  const provider = new WaxrewardsPostbackProvider();
  let previous: string[];

  beforeEach(() => {
    previous = [ ...config.walls.waxrewards.security.whitelistedIPs ];
  });

  afterEach(() => {
    config.walls.waxrewards.security.whitelistedIPs = previous;
  });

  test('strips IPv4-mapped IPv6 prefix before compare', () => {
    config.walls.waxrewards.security.whitelistedIPs = [ '203.0.113.50' ];

    expect(provider.validateSecurity(
      validationContext({}, '::ffff:203.0.113.50'),
      {} as never,
      mockContext(),
    )).toBe(true);
  });
});
