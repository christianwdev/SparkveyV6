import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { TypedServer } from 'types/SocketEvents';

// Databases
import startDatabase from '../database/database';

// Config
import startRedis from '../database/redis';
import { createDistributedLock } from '../utils/distributedLock';

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
};

console.log('Worker is running');