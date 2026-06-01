// Types
import type { MongoClient, Db } from 'mongodb';
import type Redis from 'ioredis';
import type { TypedServer } from 'types/SocketEvents';
import type { DistributedLock } from '../backend/utils/distributedLock';

type GlobalObject = {
  db: Db,
  mongoClient: MongoClient,
  redisClient: Redis,
  redisPubClient: Redis,
  redisSubClient: Redis,
  io: TypedServer,
  distributedLock?: DistributedLock,
};

export default GlobalObject;
