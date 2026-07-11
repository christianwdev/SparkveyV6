import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

// Databases
import startDatabase from '../database/database';

// Utils
import startRedis from '../database/redis';
import { createDistributedLock } from '../utils/distributedLock';

// Workers
import startRewardsWorkers from './rewards';
import startOffersWorkers from './offers';

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

startRewardsWorkers();
startOffersWorkers();

console.log('Worker is running');