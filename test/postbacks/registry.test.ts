import { describe, expect, test } from 'bun:test';
import { getPostbackProvider } from 'backend/schemas/postback';

describe('getPostbackProvider registry', () => {
  test('resolves every provider by id (case-insensitive)', () => {
    const ids = [
      'ayetstudios',
      'lootably',
      'waxrewards',
      'adtowall',
      'torox',
      'timewall',
      'cpxresearch',
      'hangmyads',
      'gemiads',
      'adscend',
      'playid',
    ];

    for (const id of ids) {
      const provider = getPostbackProvider(id);
      expect(provider).toBeDefined();
      expect(provider!.id).toBe(id === 'adtowall' ? 'adtowall' : id);
      expect(getPostbackProvider(id.toUpperCase())?.id).toBe(provider!.id);
    }
  });

  test('resolves adtogame alias to adtowall provider', () => {
    expect(getPostbackProvider('adtogame')?.id).toBe('adtowall');
  });

  test('returns undefined for unknown providers', () => {
    expect(getPostbackProvider('not-a-real-wall')).toBeUndefined();
  });
});
