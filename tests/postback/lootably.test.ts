import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import config from 'backend/config/config';
import { LootablyPostbackProvider } from 'backend/schemas/postback/providers/lootably';
import { lootablyHash, mockContext, validationContext } from './helpers';

const TEST_SECRET = 'test-lootably-postback-secret';

describe('LootablyPostbackProvider security', () => {
  const provider = new LootablyPostbackProvider();
  let previousSecret: string | undefined;

  beforeEach(() => {
    previousSecret = config.walls.lootably.security.secret;
    config.walls.lootably.security.secret = TEST_SECRET;
  });

  afterEach(() => {
    config.walls.lootably.security.secret = previousSecret;
  });

  test('accepts hash matching Lootably docs: sha256(user+ip+revenue+currencyReward+secret)', () => {
    const query = {
      user: 'user_abc',
      userIP: '203.0.113.10',
      usdValue: '1.25',
      value: '1250',
      offerID: 'offer-1',
      offerName: 'Offer One',
      conversionID: 'conv-1',
      status: '1',
    };

    const hash = lootablyHash({
      user: query.user,
      userIP: query.userIP,
      usdValue: query.usdValue,
      value: query.value,
      secret: TEST_SECRET,
    });

    const ok = provider.validateSecurity(
      validationContext({ ...query, hash }),
      query as never,
      mockContext(),
    );

    expect(ok).toBe(true);
  });

  test('treats missing userIP as empty string in the hash payload', () => {
    const query = {
      user: 'user_abc',
      usdValue: '0.50',
      value: '500',
      offerID: 'offer-1',
      offerName: 'Offer One',
      conversionID: 'conv-2',
      status: '1',
    };

    const hash = lootablyHash({
      user: query.user,
      usdValue: query.usdValue,
      value: query.value,
      secret: TEST_SECRET,
    });

    expect(provider.validateSecurity(
      validationContext({ ...query, hash }),
      query as never,
      mockContext(),
    )).toBe(true);
  });

  test('rejects wrong hash, missing hash, and missing secret', () => {
    const query = {
      user: 'user_abc',
      userIP: '203.0.113.10',
      usdValue: '1.00',
      value: '1000',
      hash: 'deadbeef',
    };

    expect(provider.validateSecurity(
      validationContext(query),
      query as never,
      mockContext(),
    )).toBe(false);

    expect(provider.validateSecurity(
      validationContext({ ...query, hash: undefined }),
      query as never,
      mockContext(),
    )).toBe(false);

    config.walls.lootably.security.secret = undefined;
    const validHash = lootablyHash({
      user: query.user,
      userIP: query.userIP,
      usdValue: query.usdValue,
      value: query.value,
      secret: TEST_SECRET,
    });

    expect(provider.validateSecurity(
      validationContext({ ...query, hash: validHash }),
      query as never,
      mockContext(),
    )).toBe(false);
  });

  test('rejects hash when any signed field is tampered', () => {
    const base = {
      user: 'user_abc',
      userIP: '203.0.113.10',
      usdValue: '1.00',
      value: '1000',
    };
    const hash = lootablyHash({ ...base, secret: TEST_SECRET });

    expect(provider.validateSecurity(
      validationContext({ ...base, value: '9999', hash }),
      base as never,
      mockContext(),
    )).toBe(false);

    expect(provider.validateSecurity(
      validationContext({ ...base, usdValue: '9.99', hash }),
      base as never,
      mockContext(),
    )).toBe(false);

    expect(provider.validateSecurity(
      validationContext({ ...base, user: 'other_user', hash }),
      base as never,
      mockContext(),
    )).toBe(false);
  });

  test('normalize maps status 0 / chargeback to reversed', () => {
    const completed = provider.normalize({
      user: 'u',
      value: '100',
      offerID: 'o',
      offerName: 'n',
      conversionID: 'c1',
      usdValue: '0.1',
      status: '1',
    });
    expect(completed.status).toBe('completed');

    const reversedZero = provider.normalize({
      user: 'u',
      value: '100',
      offerID: 'o',
      offerName: 'n',
      conversionID: 'c2',
      usdValue: '0.1',
      status: '0',
    });
    expect(reversedZero.status).toBe('reversed');

    const chargeback = provider.normalize({
      user: 'u',
      value: '100',
      offerID: 'o',
      offerName: 'n',
      conversionID: 'c3',
      usdValue: '0.1',
      status: 'Chargeback',
    });
    expect(chargeback.status).toBe('reversed');
  });
});
