import { afterEach, describe, expect, test } from 'bun:test';
import { readEnv, unquoteProcessEnv } from 'backend/utils/env';

const KEY = 'READ_ENV_TEST_VALUE';

afterEach(() => {
  delete process.env[KEY];
});

describe('readEnv', () => {
  test('returns undefined when unset', () => {
    expect(readEnv(KEY)).toBeUndefined();
  });

  test('strips wrapping double quotes', () => {
    process.env[KEY] = '"rediss://example.upstash.io:6379"';

    expect(readEnv(KEY)).toBe('rediss://example.upstash.io:6379');
  });

  test('strips wrapping single quotes', () => {
    process.env[KEY] = "'mongodb+srv://example.net/db'";

    expect(readEnv(KEY)).toBe('mongodb+srv://example.net/db');
  });

  test('leaves unquoted values alone', () => {
    process.env[KEY] = 'mongodb+srv://example.net/db';

    expect(readEnv(KEY)).toBe('mongodb+srv://example.net/db');
  });

  test('unquoteProcessEnv strips quotes on process.env', () => {
    process.env[KEY] = '"quoted-secret"';
    unquoteProcessEnv();

    expect(process.env[KEY]).toBe('quoted-secret');
  });
});
