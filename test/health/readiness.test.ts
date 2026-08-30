import { describe, expect, mock, test } from 'bun:test';

const mongoCommand = mock(async () => ({ ok: 1 }));
const redisClient = {
  status: 'ready',
  ping: mock(async () => 'PONG'),
};

mock.module('backend/utils/globalObject', () => ({
  getGlobalObject: () => ({
    db: { command: mongoCommand },
    redisClient,
  }),
}));

const { probeDependencies, getReadiness } = await import('backend/utils/health');

describe('readiness probe', () => {
  test('ready when mongo and redis respond', async () => {
    const checks = await probeDependencies();

    expect(checks).toEqual({ mongo: true, redis: true });

    const readiness = await getReadiness();

    expect(readiness.ready).toBe(true);
    expect(readiness.checks).toEqual({ mongo: true, redis: true });
  });

  test('not ready when redis is disconnected', async () => {
    redisClient.status = 'end';

    const checks = await probeDependencies();

    expect(checks).toEqual({ mongo: true, redis: false });

    redisClient.status = 'ready';
  });

  test('not ready when mongo ping fails', async () => {
    mongoCommand.mockImplementationOnce(async () => {
      throw new Error('down');
    });

    const checks = await probeDependencies();

    expect(checks.mongo).toBe(false);
    expect(checks.redis).toBe(true);
  });

  test('not ready after shutdown begins', async () => {
    const { beginShutdown } = await import('backend/utils/shutdown');
    beginShutdown();

    const readiness = await getReadiness();

    expect(readiness.ready).toBe(false);
  });
});
