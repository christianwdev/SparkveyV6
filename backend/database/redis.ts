import Redis from 'ioredis';

export default async function startRedis(): Promise<[ redisClient: Redis, redisSubscriber: Redis, redisPublisher: Redis ]> {
  if (!process.env.REDIS_URI) throw new Error('No redis provided.');

  const client = new Redis(process.env.REDIS_URI);

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
