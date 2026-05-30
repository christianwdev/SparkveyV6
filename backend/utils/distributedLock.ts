import { createLock } from 'syncguard/redis';

// Types
import type Redis from 'ioredis';
import type { RedisBackendOptions } from 'syncguard/redis';

export { LockError } from 'syncguard';

const DEFAULT_KEY_PREFIX = 'hono-next-base';

/**
 * Redis-backed distributed lock (SyncGuard). Use `await lock(fn, { key, ttlMs })`
 * for critical sections; lock is released when `fn` settles.
 */
export function createDistributedLock(redis: Redis, options?: RedisBackendOptions) {
  return createLock(redis, {
    keyPrefix: DEFAULT_KEY_PREFIX,
    ...options,
  });
}

export type DistributedLock = ReturnType<typeof createDistributedLock>;
