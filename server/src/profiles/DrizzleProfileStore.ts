import { eq } from 'drizzle-orm';
import { connectDatabase, type Database, type DbConnection } from '../db/connection';
import { profiles } from '../db/schema';
import type { ProfileIdentity, ProfileStore } from './ProfileStore';

/** Postgres-backed {@link ProfileStore} using Drizzle over a pooled pg connection. */
export class DrizzleProfileStore implements ProfileStore {
  private readonly db: Database;
  private readonly close_: () => Promise<void>;

  constructor(connection: DbConnection) {
    this.db = connection.db;
    this.close_ = () => connection.pool.end();
  }

  static fromUrl(connectionString: string): DrizzleProfileStore {
    return new DrizzleProfileStore(connectDatabase(connectionString));
  }

  async upsert(identity: ProfileIdentity, avatar: number): Promise<number> {
    if (!identity.clientId) {
      throw new Error('clientId is required to save a profile');
    }
    const existing = await this.find(identity);
    if (existing) {
      await this.db
        .update(profiles)
        .set({
          avatar,
          baleUserId: identity.baleUserId ?? existing.baleUserId,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, existing.id));
      return avatar;
    }

    await this.db.insert(profiles).values({
      clientId: identity.clientId,
      baleUserId: identity.baleUserId,
      avatar,
    });
    return avatar;
  }

  async get(identity: ProfileIdentity): Promise<number | null> {
    const row = await this.find(identity);
    return row?.avatar ?? null;
  }

  close(): Promise<void> {
    return this.close_();
  }

  private async find(identity: ProfileIdentity) {
    if (identity.baleUserId) {
      const [byBale] = await this.db
        .select()
        .from(profiles)
        .where(eq(profiles.baleUserId, identity.baleUserId))
        .limit(1);
      if (byBale) return byBale;
    }
    if (identity.clientId) {
      const [byClient] = await this.db
        .select()
        .from(profiles)
        .where(eq(profiles.clientId, identity.clientId))
        .limit(1);
      return byClient ?? null;
    }
    return null;
  }
}
