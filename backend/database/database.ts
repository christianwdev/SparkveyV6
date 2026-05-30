import SiteConfig from '../config/config';
import { MongoClient } from 'mongodb';
import ensureIndexes from './ensureIndexes';

// Types
import type { Db } from 'mongodb';

export default async function startDatabase(): Promise<[ db: Db, client: MongoClient ]> {
  if (!process.env.MONGODB_URI) throw new Error('No database provided.');
  if (!SiteConfig.database.name) throw new Error('No database name provided.');

  const client = await MongoClient.connect(process.env.MONGODB_URI, {
    compressors: [ 'zstd' ],
  });

  const db = client.db(SiteConfig.database.name);

  await ensureIndexes(db);

  return [ db, client ];
}
