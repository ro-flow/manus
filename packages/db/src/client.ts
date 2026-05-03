import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL omgevingsvariabele is niet ingesteld');
    }
    const client = postgres(connectionString, { ssl: 'require' });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export type Db = ReturnType<typeof getDb>;
