import { getGlobalObject } from './globalObject';
import { isShuttingDown } from './shutdown';

const PROBE_TIMEOUT_MS = 2_000;

export type DependencyHealth = {
  mongo: boolean,
  redis: boolean,
};

export type Readiness = {
  ready: boolean,
  checks: DependencyHealth,
};

export async function probeDependencies(): Promise<DependencyHealth> {
  try {
    const { db, redisClient } = getGlobalObject();

    const [ mongoResult, redisResult ] = await Promise.allSettled([
      withTimeout(db.command({ ping: 1 }), PROBE_TIMEOUT_MS),
      pingRedis(redisClient),
    ]);

    return {
      mongo: mongoResult.status === 'fulfilled',
      redis: redisResult.status === 'fulfilled' && redisResult.value,
    };
  } catch {
    return { mongo: false, redis: false };
  }
}

export async function getReadiness(): Promise<Readiness> {
  if (isShuttingDown()) {
    return {
      ready: false,
      checks: { mongo: false, redis: false },
    };
  }

  const checks = await probeDependencies();

  return {
    ready: checks.mongo && checks.redis,
    checks,
  };
}

async function pingRedis(redisClient: { status: string, ping: () => Promise<string> }): Promise<boolean> {
  if (redisClient.status !== 'ready') return false;

  const pong = await withTimeout(redisClient.ping(), PROBE_TIMEOUT_MS);

  return pong === 'PONG';
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('probe timeout')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
