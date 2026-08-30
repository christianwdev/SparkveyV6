import SiteConfig from '../config/config';
import { MongoClient } from 'mongodb';
import ensureIndexes from './ensureIndexes';
import { readEnv } from '../utils/env';

// Types
import type { Db } from 'mongodb';

export default async function startDatabase(): Promise<[ db: Db, client: MongoClient ]> {
  const mongoUri = readEnv('MONGODB_URI');
  if (!mongoUri) throw new Error('No database provided.');
  if (!SiteConfig.database.name) throw new Error('No database name provided.');

  const client = await MongoClient.connect(mongoUri, {
    compressors: [ 'zstd' ],
    maxPoolSize: 20,
  });

  const db = client.db(SiteConfig.database.name);

  await ensureIndexes(db);

  return [ db, client ];
}
