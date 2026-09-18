import { and, eq } from 'drizzle-orm';
import { connectDatabase, type DbConnection } from '../db/connection';
import { createBans } from '../db/schema';
import type { CreateBan, StoredCreateBan } from './HostedRoomQuota';

/** Banned addresses and accounts. A restart keeps the block until it expires. */
export class DrizzleCreateBanStore {
  private readonly db: DbConnection['db'];

  constructor(connection: DbConnection) {
    this.db = connection.db;
  }

  static fromUrl(connectionString: string): DrizzleCreateBanStore {
    return new DrizzleCreateBanStore(connectDatabase(connectionString));
  }

  async list(): Promise<StoredCreateBan[]> {
    const rows = await this.db
      .select({
        kind: createBans.kind,
        value: createBans.value,
        bannedAt: createBans.bannedAt,
      })
      .from(createBans);
    return rows.flatMap((row) => {
      if (row.kind !== 'ip' && row.kind !== 'user') return [];
      return [{ kind: row.kind, value: row.value, bannedAt: row.bannedAt.getTime() }];
    });
  }

  async add(ban: CreateBan): Promise<void> {
    await this.db
      .insert(createBans)
      .values(ban)
      .onConflictDoUpdate({
        target: [createBans.kind, createBans.value],
        set: { bannedAt: new Date() },
      });
  }

  async remove(ban: CreateBan): Promise<void> {
    await this.db
      .delete(createBans)
      .where(and(eq(createBans.kind, ban.kind), eq(createBans.value, ban.value)));
  }
}
