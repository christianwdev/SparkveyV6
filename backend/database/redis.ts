import Redis from 'ioredis';
import { readEnv } from '../utils/env';

export default async function startRedis(): Promise<[ redisClient: Redis, redisSubscriber: Redis, redisPublisher: Redis ]> {
  const redisUri = readEnv('REDIS_URI');
  if (!redisUri) throw new Error('No redis provided.');

  const client = new Redis(redisUri);

  const publisher = client.duplicate();
  const subscriber = client.duplicate();

  publisher.on('error', err => {
    console.error('Redis Client Error ', err);
  });

  subscriber.on('error', err => {
    console.error('Redis Client Error ', err);
  });

  client.on('error', err => {
    console.error('Redis Client Error ', err);
  });

  return [ client, subscriber, publisher ];
}
