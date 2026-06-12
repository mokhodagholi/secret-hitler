import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;

export interface DbConnection {
  db: Database;
  pool: pg.Pool;
}

/** Open a pooled Postgres connection wired to the Drizzle schema. */
export function connectDatabase(connectionString: string): DbConnection {
  const pool = new pg.Pool({ connectionString });
  return { db: drizzle(pool, { schema }), pool };
}
