import { resolve } from 'node:path';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

/** Apply Drizzle SQL migrations from `server/drizzle`. */
export async function migrateDatabase(
  connectionString: string,
  migrationsFolder: string,
): Promise<void> {
  const pool = new pg.Pool({ connectionString });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}

/** Folder next to src/ or dist/, so tsx and the compiled entry both resolve it. */
export function drizzleFolder(fromDir: string): string {
  return resolve(fromDir, '../drizzle');
}
