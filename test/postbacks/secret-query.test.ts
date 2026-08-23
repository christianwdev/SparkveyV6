import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import config from 'backend/config/config';
import { AdtogamePostbackProvider } from 'backend/schemas/postback/providers/adtogame';
import { HangmyadsPostbackProvider } from 'backend/schemas/postback/providers/hangmyads';
import { PlayidPostbackProvider } from 'backend/schemas/postback/providers/playid';
import { mockContext, validationContext } from './helpers';

describe('secret query postback providers', () => {
  describe('AdtogamePostbackProvider (adtowall)', () => {
    const provider = new AdtogamePostbackProvider();
    const secret = 'adtowall-test-secret';
    let previous: string | undefined;

    beforeEach(() => {
      previous = config.walls.adtowall.security.secret;
      config.walls.adtowall.security.secret = secret;
    });

    afterEach(() => {
      config.walls.adtowall.security.secret = previous;
    });

    test('accepts matching secret and rejects mismatch / missing config', () => {
      expect(provider.validateSecurity(
        validationContext({ secret }),
        {} as never,
        mockContext(),
      )).toBe(true);

      expect(provider.validateSecurity(
        validationContext({ secret: 'wrong' }),
        {} as never,
        mockContext(),
      )).toBe(false);

      config.walls.adtowall.security.secret = undefined;
      expect(provider.validateSecurity(
        validationContext({ secret }),
        {} as never,
        mockContext(),
      )).toBe(false);
    });
  });

  describe('HangmyadsPostbackProvider', () => {
    const provider = new HangmyadsPostbackProvider();
    const secret = 'hangmyads-test-secret';
    let previous: string | undefined;

    beforeEach(() => {
      previous = config.walls.hangmyads.security.secret;
      config.walls.hangmyads.security.secret = secret;
    });

    afterEach(() => {
      config.walls.hangmyads.security.secret = previous;
    });

    test('accepts matching secret and rejects mismatch', () => {
      expect(provider.validateSecurity(
        validationContext({ secret }),
        {} as never,
        mockContext(),
      )).toBe(true);

      expect(provider.validateSecurity(
        validationContext({ secret: 'wrong' }),
        {} as never,
        mockContext(),
      )).toBe(false);
    });
  });

  describe('PlayidPostbackProvider', () => {
    const provider = new PlayidPostbackProvider();
    const secret = 'playid-test-secret';
    let previous: string | undefined;

    beforeEach(() => {
      previous = config.walls.playid.security.secret;
      config.walls.playid.security.secret = secret;
    });

    afterEach(() => {
      config.walls.playid.security.secret = previous;
    });

    test('accepts matching secret and rejects mismatch', () => {
      expect(provider.validateSecurity(
        validationContext({ secret }),
        {} as never,
        mockContext(),
      )).toBe(true);

      expect(provider.validateSecurity(
        validationContext({ secret: 'wrong' }),
        {} as never,
        mockContext(),
      )).toBe(false);
    });
  });
});
