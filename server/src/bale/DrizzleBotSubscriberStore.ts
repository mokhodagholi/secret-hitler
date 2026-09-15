import { and, eq } from 'drizzle-orm';
import type { MessengerKind } from '@secret-hitler/shared';
import { connectDatabase, type Database, type DbConnection } from '../db/connection';
import { botBlastDeliveries, botSubscribers } from '../db/schema';
import type { BotBlastDelivery, BotSubscriberStore } from './BotSubscriberStore';

/** Postgres-backed {@link BotSubscriberStore}. */
export class DrizzleBotSubscriberStore implements BotSubscriberStore {
  private readonly db: Database;
  private readonly close_: () => Promise<void>;

  constructor(connection: DbConnection) {
    this.db = connection.db;
    this.close_ = () => connection.pool.end();
  }

  static fromUrl(connectionString: string): DrizzleBotSubscriberStore {
    return new DrizzleBotSubscriberStore(connectDatabase(connectionString));
  }

  async upsert(platform: MessengerKind, chatId: string): Promise<void> {
    if (!chatId) return;
    await this.db
      .insert(botSubscribers)
      .values({ platform, chatId })
      .onConflictDoNothing({
        target: [botSubscribers.platform, botSubscribers.chatId],
      });
  }

  async list(platform: MessengerKind): Promise<string[]> {
    const rows = await this.db
      .select({ chatId: botSubscribers.chatId })
      .from(botSubscribers)
      .where(eq(botSubscribers.platform, platform));
    return rows.map((row) => row.chatId);
  }

  async remove(platform: MessengerKind, chatId: string): Promise<void> {
    await this.db
      .delete(botSubscribers)
      .where(and(eq(botSubscribers.platform, platform), eq(botSubscribers.chatId, chatId)));
  }

  async replaceLastBlast(platform: MessengerKind, deliveries: BotBlastDelivery[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(botBlastDeliveries).where(eq(botBlastDeliveries.platform, platform));
      if (deliveries.length === 0) return;
      await tx.insert(botBlastDeliveries).values(
        deliveries.map((row) => ({
          platform,
          chatId: row.chatId,
          messageId: row.messageId,
        })),
      );
    });
  }

  async listLastBlast(platform: MessengerKind): Promise<BotBlastDelivery[]> {
    const rows = await this.db
      .select({
        chatId: botBlastDeliveries.chatId,
        messageId: botBlastDeliveries.messageId,
      })
      .from(botBlastDeliveries)
      .where(eq(botBlastDeliveries.platform, platform));
    return rows;
  }

  close(): Promise<void> {
    return this.close_();
  }
}
