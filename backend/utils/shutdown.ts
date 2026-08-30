import { getGlobalObject } from './globalObject';

// Types
import type { MongoClient } from 'mongodb';
import type Redis from 'ioredis';
import type { TypedServer } from 'types/SocketEvents';

const SHUTDOWN_TIMEOUT_MS = 25_000;
const READINESS_PROPAGATION_MS = 2_000; // let the LB see /health/ready 503
const CONNECTION_CLOSE_SLACK_MS = 3_000;

type StoppableServer = {
  stop: (closeActiveConnections?: boolean) => void,
};

type CloseableEngine = {
  close: () => void,
};

type CloseSharedConnectionsParams = {
  mongoClient: MongoClient,
  redisClient: Redis,
  redisPubClient: Redis,
  redisSubClient: Redis,
};

let shuttingDown = false;
let inFlight = 0;

export function isShuttingDown(): boolean {
  return shuttingDown;
}

export function beginShutdown(): boolean {
  if (shuttingDown) return false;
  shuttingDown = true;

  return true;
}

export function trackInFlight<T>(work: T | Promise<T>): Promise<T> {
  inFlight += 1;

  return Promise.resolve(work).finally(() => {
    inFlight -= 1;
  });
}

export function isHealthPath(pathname: string): boolean {
  return pathname === '/health' || pathname.startsWith('/health/');
}

export async function closeSharedConnections(
  {
    mongoClient,
    redisClient,
    redisPubClient,
    redisSubClient,
  }: CloseSharedConnectionsParams,
): Promise<void> {
  await Promise.allSettled([
    mongoClient.close(),
    quitRedis(redisClient),
    quitRedis(redisPubClient),
    quitRedis(redisSubClient),
  ]);
}

export async function closeSocketServer(io: TypedServer): Promise<void> {
  await new Promise<void>(resolve => {
    io.close(() => resolve());
  });
}

export async function drainInFlight(): Promise<void> {
  await waitForInFlight(SHUTDOWN_TIMEOUT_MS - CONNECTION_CLOSE_SLACK_MS);
}

export async function drainBackend(
  {
    server,
    engine,
  }: {
    server: StoppableServer,
    engine: CloseableEngine,
  },
): Promise<void> {
  await sleep(READINESS_PROPAGATION_MS);
  await closeSocketServer(getGlobalObject().io);
  engine.close();
  server.stop();
  await waitForInFlight(SHUTDOWN_TIMEOUT_MS - READINESS_PROPAGATION_MS - CONNECTION_CLOSE_SLACK_MS);
}

export function registerProcessShutdown(run: () => Promise<void>): void {
  const onSignal = (signal: string) => {
    if (!beginShutdown()) return;

    console.log(`Received ${signal}, shutting down`);

    setTimeout(() => {
      console.error('Graceful shutdown timed out');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    const execute = async () => {
      try {
        await run();
        process.exit(0);
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    };

    execute().catch(error => {
      console.error(error);
      process.exit(1);
    });
  };

  process.on('SIGTERM', () => onSignal('SIGTERM'));
  process.on('SIGINT', () => onSignal('SIGINT'));
}

async function quitRedis(client: Redis): Promise<void> {
  if (client.status === 'end') return;

  await client.quit();
}

async function waitForInFlight(timeoutMs: number): Promise<void> {
  const started = Date.now();

  while (inFlight > 0 && Date.now() - started < timeoutMs) {
    await sleep(50);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
