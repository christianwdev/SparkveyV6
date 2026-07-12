import { getGlobalObject } from './globalObject';

const LOCK_TTL_SECONDS = 30;

/**
 * Generic Redis cache wrapper with stampede protection.
 *
 * On a cache miss only the request that wins the SET NX lock rebuilds the
 * value and writes it back. All other concurrent misses still run the builder
 * and return a fresh result — they just don't write to cache.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  builder: () => Promise<T>,
): Promise<T> {
  const { redisClient } = getGlobalObject();

  const cached = await redisClient.get(key);
  if (cached) {
    try {
      return JSON.parse(cached) as T;
    } catch {
      // corrupted entry — fall through to rebuild
    }
  }

  const lockKey = `${key}:lock`;
  const lockAcquired = await redisClient.set(lockKey, '1', 'EX', LOCK_TTL_SECONDS, 'NX');

  const value = await builder();

  if (lockAcquired === 'OK') {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    await redisClient.del(lockKey);
  }

  return value;
}
