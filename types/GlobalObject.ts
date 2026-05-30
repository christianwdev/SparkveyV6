// Types
import type { MongoClient, Db } from 'mongodb';
import type Redis from 'ioredis';
import type { Server } from 'socket.io';
import type { DistributedLock } from '../backend/utils/distributedLock';

type GlobalObject = {
  db: Db,
  mongoClient: MongoClient,
  redisClient: Redis,
  redisPubClient: Redis,
  redisSubClient: Redis,
  io: Server,
  distributedLock?: DistributedLock,
};

export default GlobalObject;
