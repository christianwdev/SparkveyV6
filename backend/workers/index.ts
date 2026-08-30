import '../utils/unquoteEnv';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

// Databases
import startDatabase from '../database/database';

// Utils
import startRedis from '../database/redis';
import { createDistributedLock } from '../utils/distributedLock';
import {
  closeSharedConnections,
  closeSocketServer,
  drainInFlight,
  registerProcessShutdown,
} from '../utils/shutdown';

// Workers
import startCurrencyWorker from './currency';
import startRewardsWorkers from './rewards';
import startOffersWorkers from './offers';
import startLeaderboardWorker from './leaderboard';
import startHoldsWorker from './holds';

// Types
import type { TypedServer } from 'types/SocketEvents';
import type GlobalObject from 'types/GlobalObject';

const [
  [ db, client ],
  [ redisClient ],
] = await Promise.all([
  startDatabase(),
  startRedis(),
]);

const redisPubClient = redisClient.duplicate();
const redisSubClient = redisClient.duplicate();

const io: TypedServer = new Server({
  pingTimeout: 5000,
  adapter: createAdapter(redisPubClient, redisSubClient),
});

global.globalObject = {
  db,
  mongoClient: client,
  redisClient,
  redisPubClient,
  redisSubClient,
  io,
  distributedLock: createDistributedLock(redisClient),
} satisfies GlobalObject;

registerProcessShutdown(async () => {
  await closeSocketServer(io);
  await drainInFlight();
  await closeSharedConnections({
    mongoClient: client,
    redisClient,
    redisPubClient,
    redisSubClient,
  });
});

await startCurrencyWorker();
startRewardsWorkers();
startOffersWorkers();
startLeaderboardWorker();
startHoldsWorker();

console.log('Worker is running');
