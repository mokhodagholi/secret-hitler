import { eq } from 'drizzle-orm';
import { connectDatabase, type Database, type DbConnection } from '../db/connection';
import { liveRooms } from '../db/schema';
import type { LiveRoomSnapshot, LiveRoomStore } from './LiveRoomStore';

/** Postgres-backed {@link LiveRoomStore} using Drizzle over a pooled pg connection. */
export class DrizzleLiveRoomStore implements LiveRoomStore {
  private readonly db: Database;
  private readonly close_: () => Promise<void>;

  constructor(connection: DbConnection) {
    this.db = connection.db;
    this.close_ = () => connection.pool.end();
  }

  static fromUrl(connectionString: string): DrizzleLiveRoomStore {
    return new DrizzleLiveRoomStore(connectDatabase(connectionString));
  }

  async save(id: string, code: string, snapshot: LiveRoomSnapshot): Promise<void> {
    await this.db
      .insert(liveRooms)
      .values({
        id,
        code,
        snapshot,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: liveRooms.id,
        set: {
          code,
          snapshot,
          updatedAt: new Date(),
        },
      });
  }

  async remove(id: string): Promise<void> {
    await this.db.delete(liveRooms).where(eq(liveRooms.id, id));
  }

  async loadAll(): Promise<LiveRoomSnapshot[]> {
    const rows = await this.db.select().from(liveRooms);
    return rows.map((row) => row.snapshot);
  }

  close(): Promise<void> {
    return this.close_();
  }
}
