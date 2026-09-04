import { afterEach, describe, expect, test } from 'bun:test';
import {
  REF_STORAGE_KEY,
  clearStoredReferralCode,
  getStoredReferralCode,
  persistReferralCode,
  persistReferralCodeFromSearch,
  resolveReferralCode,
} from '../../src/utils/referral';

const memory = new Map<string, string>();

const localStorageMock = {
  getItem(key: string) {
    return memory.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    memory.set(key, value);
  },
  removeItem(key: string) {
    memory.delete(key);
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

Object.defineProperty(globalThis, 'window', {
  value: globalThis,
  configurable: true,
});

describe('referral storage', () => {
  afterEach(() => {
    memory.clear();
  });

  test('persists a valid ref from search params', () => {
    persistReferralCodeFromSearch(new URLSearchParams('ref=Promo_1'));

    expect(memory.get(REF_STORAGE_KEY)).toBe('Promo_1');
    expect(getStoredReferralCode()).toBe('Promo_1');
  });

  test('ignores invalid ref values', () => {
    persistReferralCode('not a code!!');

    expect(getStoredReferralCode()).toBe('');
  });

  test('clears the stored ref', () => {
    persistReferralCode('abc123');
    clearStoredReferralCode();

    expect(getStoredReferralCode()).toBe('');
  });

  test('resolveReferralCode prefers a valid URL ref over storage', () => {
    persistReferralCode('stored_code');

    expect(resolveReferralCode('Url_Code')).toBe('Url_Code');
    expect(resolveReferralCode('not a code!!')).toBe('stored_code');
    expect(resolveReferralCode(null)).toBe('stored_code');
  });
});
